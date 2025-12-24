import express from "express";
import axios from "axios";
import path from "path";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

const dirname = path.resolve();
const upload = multer({ dest: "uploads/" });

const app = express();
const port = 3000;

const BASE_URL = "https://api.ilovepdf.com/v1";
let TOKEN = null;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//authorization
async function authenticate() {
  if (TOKEN) return TOKEN;

  const res = await axios.post(`${BASE_URL}/auth`, {
    public_key: process.env.ILOVEPDF_PUBLIC_KEY,
  });

  TOKEN = res.data.token;
  
  return TOKEN;
}

//start task
async function startTask(tool, region = "eu"){
    const res = await axios.get(`${BASE_URL}/start/${tool}/${region}`,
    {
        headers:{
            Authorization : `Bearer ${TOKEN}`,
        },
    });

    return res.data;
}

//upload file to api
async function uploadFile(server, task, filePath, originalname){

    const form = new FormData();
    form.append("task", task);
    form.append("file", fs.createReadStream(filePath),{
        filename: originalname,
        contentType: "application/pdf",
    });

    

    const res = await axios.post(
    `https://${server}/v1/upload`,
    form,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        ...form.getHeaders(),
      },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    }
    );

    return res.data.server_filename;
}

//merge function
async function processMerge(server, task, files) {
  const payload = {
    task,
    tool: "merge",
    files: files.map((file) => ({
      server_filename: file.server_filename,
      filename: file.originalname,
    })),
    output_filename: "merged_{date}.pdf",
  };

  await axios.post(
    `https://${server}/v1/process`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );
}

//download function
async function downloadFile(server, task, res) {
  const response = await axios.get(
    `https://${server}/v1/download/${task}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
      responseType: "stream",
    }
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=merged.pdf"
  );

  response.data.pipe(res);
}


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res)=>{
    res.sendFile(path.resolve("public/html/home.html"));
});

app.post("/merge", upload.array("files", 10), async (req, res)=>{
    try{
        await authenticate();

        const {server, task} = await startTask("merge");
        const cleanServer = server.replace(/^https?:\/\//, "").trim();

        const uploadedFiles = [];

        for(const file of req.files){
            if(file.mimetype !== "application/pdf") {
                throw new Error("Only PDF files are allowed");
            }
            const serverFileName = await uploadFile(server, task, file.path,file.originalname);
            
            uploadedFiles.push({
                server_filename : serverFileName,
                originalname : file.originalname,
                path : file.path
                } 
            );
        }

        await processMerge(server, task, uploadedFiles);
        await downloadFile(server, task, res);

        uploadedFiles.forEach((f) => fs.unlinkSync(f.path));
    }catch(err){
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "PDF merge failed" });
    }
});