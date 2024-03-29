const BlockChainModel = require("../models/BlockChain");
const Blockchain = require("../utils/Blockchain");
const response = require("../utils/Response");
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
    // options
});

const blockchain = new Blockchain();
io.on("connection", (socket) => {
    console.log("New Client Connected:", socket.id);
});
(() => {
    BlockChainModel.find({}).then(
        async (result) => {
            await result.forEach((value, index) => {
                blockchain.newBlock(value.timestamp, value.data);
            });
            console.log("Blockchain Created: ", blockchain.chain.length);
        },
        (err) => {
            console.log("Error Creating the block chain");
        }
    );
    httpServer.listen(8502);
})();

const Vote = (req, res) => {
    /**
     * BODY: partyId
     */
    if (blockchain.exists(req.session.user.voterId)) {
        return response(res, false, "You have already voted");
    } else {
        var date = Date.now();
        var resp = blockchain.newBlock(date, {
            voterId: req.session.user.voterId,
            aadharId: req.session.user.aadharId,
            panId: req.session.user.panId,
            vote: req.body.candidateId,
        });

        io.emit("vote", {
            date,
            voterId: req.session.user.voterId,
            aadharId: req.session.user.aadharId,
            panId: req.session.user.panId,
            vote: req.body.candidateId,
        });
        if (resp == true) {
            let lb = blockchain.lastBlock;
            const query = new BlockChainModel({
                index: lb.index,
                timestamp: lb.timestamp,
                data: lb.data,
                prevHash: lb.prevHash,
                hash: lb.hash,
            });
            query.save().then(
                (result) => {
                    console.log(
                        "[+] Vote Registered. BlockId: ",
                        result._id.toString()
                    );
                    req.session.destroy((err) => {
                        if (err) throw err;
                        io.emit("checkHash", {
                            hash: blockchain.lastBlock.hash,
                        });
                        return response(res, true, "Vote Casted Successfully");
                    });
                },
                (err) => {
                    return response(res, false, "Unable to cast you vote", err);
                }
            );
        }
    }
};
const isValidChain = (req, res) => {
    let isVaild = blockchain.isValidChain;
    return response(res, true, "Valid Chain Success", {
        isValid: isVaild,
        lastHash: blockchain.lastBlock.hash,
    });
};

const LiveCount = (req, res) => {
    BlockChainModel.aggregate(
        [{ $group: { _id: "$data.vote", count: { $sum: 1 } } }],
        (err, result) => {
            if (err) throw err;
            response(res, true, "Live Count Data", result);
        }
    );
};
module.exports = { Vote, isValidChain, LiveCount };
