import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function searchWeb(query) {
  const response = await axios.get("https://serpapi.com/search", {
    params: {
      api_key: process.env.SERPAPI_KEY,
      engine: "google",
      q: query,
      hl: "pt",
      gl: "br",
      num: 5
    }
  });

  const results = response.data.organic_results || [];
  if (!results.length) return "Nenhum resultado encontrado.";

  return results.slice(0, 5).map((r, i) =>
    `${i+1}. ${r.title}\n${r.snippet}\nFonte: ${r.link}`
  ).join("\n\n");
}
