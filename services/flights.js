import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function searchFlights({ origin, destination, outbound_date, return_date, adults = 1, travel_class = 1 }) {
  const params = {
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date,
    return_date,
    adults,
    travel_class,
    currency: "BRL",
    hl: "pt",
    api_key: process.env.SERPAPI_KEY
  };

  const res = await axios.get("https://serpapi.com/search", { params, timeout: 12000 });
  const data = res.data;

  const flights = data.best_flights || data.other_flights || [];
  if (!flights.length) return "Nenhum voo encontrado para este trecho.";

  let result = `Voos de ${origin} para ${destination}:\n`;
  flights.slice(0, 5).forEach((f, i) => {
    const leg = f.flights?.[0];
    const price = f.price ? `R$ ${f.price}` : "Preco indisponivel";
    const duration = f.total_duration ? `${Math.floor(f.total_duration/60)}h${f.total_duration%60}m` : "";
    const airline = leg?.airline || "";
    const dep = leg?.departure_airport?.time || "";
    const arr = leg?.arrival_airport?.time || "";
    result += `\n${i+1}. ${airline} | ${price} | ${duration} | ${dep} → ${arr}`;
  });

  return result;
}
