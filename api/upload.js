const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({ dest: "/tmp" }).single("file");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file received" });

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1️⃣ Upload the file to OpenAI
      const uploaded = await client.files.create({
        file: fs.createReadStream(req.file.path),
        purpose: "assistants"
      });

      // 2️⃣ Call GPT-5.1 using the *new Responses API*
      const response = await client.responses.create({
        model: "gpt-5.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze the uploaded file and give a detailed summary."
              },
              {
                type: "input_file",
                id: uploaded.id
              }
            ]
          }
        ]
      });

      return res.status(200).json({
        status: "success",
        file_id: uploaded.id,
        output: response.output[0].content[0].text
      });

    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
};
