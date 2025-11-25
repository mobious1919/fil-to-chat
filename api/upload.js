const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({
  dest: "/tmp",
  fileFilter: (req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/pdf"
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
    if (err) return res.status(400).json({ error: err.message });

    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1️⃣ Upload the file
      const uploaded = await client.files.create({
        purpose: "assistants",
        file: fs.createReadStream(req.file.path)
      });

      // 2️⃣ Request analysis from GPT-4.1
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: "Analyze this file and provide insights."
          },
          {
            file: {
              file_id: uploaded.id
            }
          }
        ]
      });

      return res.status(200).json({
        status: "success",
        file_id: uploaded.id,
        output: response.output_text
      });

    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
};
