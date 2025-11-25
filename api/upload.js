const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({
  dest: "/tmp",
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
    if (!req.file) return res.status(400).json({ error: "No file received" });

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Upload file to OpenAI
      const uploaded = await client.files.create({
        purpose: "assistants",
        file: fs.createReadStream(req.file.path)
      });

      // Create a proper 5.x Responses request
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze the uploaded file and summarize all key insights."
              },
              {
                type: "input_file",
                file_id: uploaded.id    // <-- correct 5.x field
              }
            ]
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
