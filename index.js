import express from "express";
import axios from "axios";
import path from "path";

const dirname = path.resolve();

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res)=>{
    res.sendFile(path.resolve("public/html/home.html"));
});

app.get("/task",async (req, res)=>{

});