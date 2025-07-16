const { StreamDescription } = require("mongodb");
const mongoose=require("mongoose");

const userScheme=new mongoose.Schema({
    fullName:{
        type:String,
        trim:true,

    },
    email:{
        type:String,
        trim:true,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    }
},{timestamps:true,})

const User=mongoose.model("new",userScheme,"datas");

module.exports=User;
