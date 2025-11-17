export const config = {
  runtime: "nodejs",
  api: {
    bodyParser: false,
  },
};

import multer from "multer";
import OpenAI from "openai";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Multer config for temporary file storage
const upload = multer({ dest: "/tmp" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default function handler(req, res) {
  upload.single("file")(req, res, async err => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const fileStream = fs.createReadStream(req.file.path);

      const result = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this uploaded file." },
              { type: "input_file", input_file: fileStream }
            ]
          }
        ]
      });

      return res.json({
        success: true,
        output: result.choices[0].message
      });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
}
