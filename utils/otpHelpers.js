const generateOTP = () => {
    return Math.floor(Math.random() * 9000 + 1000);
};

module.exports = { generateOTP };
