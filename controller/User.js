const UserModel = require("../models/User");
const response = require("../utils/Response");

const Register = (req, res) => {
    /**
     * BODY: fname, lname, aadharId, voterId, panId, dob, mobile, email
     */
    const query = new UserModel({
        fname: req.body.fname,
        lname: req.body.lname,
        aadharId: req.body.aadharId,
        voterId: req.body.voterId,
        panId: req.body.panId,
        dob: req.body.dob,
        mobile: req.body.mobile,
        email: req.body.email,
    });
    query.save().then(
        (result) => {
            return response(res, true, "Registration Successful");
        },
        (err) => {
            return response(res, false, "Unable to Register", err);
        }
    );
};
const Login = async (req, res) => {
    /**
     * BODY: aadharId, voterId, otp
     */
    const user = await UserModel.findOne(
        { aadharId: req.body.aadharId, voterId: req.body.voterId },
        { otp: 1, isVerified: 1, fname: 1, lname: 1, panId: 1 }
    );
    if (user === null) return response(res, false, "Please verify the details");
    else if (user.otp === parseInt(req.body.otp)) {
        UserModel.updateOne(
            { aadharId: req.body.aadharId, voterId: req.body.voterId },
            { $set: { otp: null } }
        ).then(
            () => {
                req.session.user = {
                    isAuthenticated: true,
                    isVerified: user.isVerified,
                    userId: user._id.toString(),
                    aadharId: req.body.aadharId,
                    voterId: req.body.voterId,
                    panId: user.panId,
                };
                response(res, true, "Login Successful", {
                    isVerified: true,
                    fname: user.fname,
                    lname: user.lname,
                });
            },
            (err) => response(res, false, "Something went wrong", err)
        );
    } else {
        return response(res, false, "Invalid OTP");
    }
};
const Logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        return response(res, true, "Logout Success");
    });
};
const OTP = (req, res) => {
    /**
     * BODY: aadharId, voterId
     */
    UserModel.findOne(
        { aadharId: req.body.aadharId, voterId: req.body.voterId },
        { isVerified: 1 },
        (err, result) => {
            if (err) throw err;
            if (result.isVerified === false)
                return response(res, false, "Your Profile is not verified");
            let otp = Math.ceil(Math.random() * 1000000);
            UserModel.updateOne(
                {
                    aadharId: req.body.aadharId,
                    voterId: req.body.voterId,
                    isVerified: true,
                },
                {
                    otp: otp,
                }
            ).then((result) => {
                if (result.matchedCount === 0) {
                    console.log(
                        "[-] Either verify details or The user isn't verified"
                    );
                    return response(
                        res,
                        false,
                        "Please verify the details",
                        result
                    );
                } else if (result.modifiedCount === 1) {
                    console.log("[+] OTP Generated: ", otp);
                    return response(res, true, "OTP Success", { otp });
                } else return response(res, false, "Something went wrong");
            });
        }
    );
};
module.exports = { Register, Login, Logout, OTP };
