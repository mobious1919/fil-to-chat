const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({
  dest: "/tmp",
  fileFilter: (req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/pdf",
      "application/zip",
      "application/octet-stream",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type: " + file.mimetype));
    }
    cb(null, true);
  }
}).single("file");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1️⃣ Upload file to OpenAI
      const fileUpload = await client.files.create({
        purpose: "assistants",
        file: fs.createReadStream(req.file.path)
      });

      // 2️⃣ Request analysis from GPT-4.1 or GPT-5.1
      const response = await client.responses.create({
        model: "gpt-4o-mini",  
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze this CSV or Excel file in detail."
              },
              {
                type: "input_file",
                input_file_id: fileUpload.id
              }
            ]
          }
        ]
      });

      return res.status(200).json({
        status: "success",
        file_id: fileUpload.id,
        result: response.output_text
      });

    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
};
