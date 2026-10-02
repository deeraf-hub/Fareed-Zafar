import { ollamaProvider } from "./providers/ollama.js";
import { openAICompatibleProvider } from "./providers/openai-compatible.js";
import { anthropicProvider } from "./providers/anthropic.js";
import { simulatedProvider } from "./providers/simulated.js";

/** Build the two model tiers from config. A tier can be absent ("none"). */
export function createProviders(models) {
  const providers = {};
  const { local, frontier, timeoutMs } = models;

  switch (local.provider) {
    case "ollama":
      providers.local = ollamaProvider({ url: local.ollamaUrl, model: local.ollamaModel, timeoutMs });
      break;
    case "openai-compatible":
      providers.local = openAICompatibleProvider({
        url: local.openaiCompatUrl,
        model: local.openaiCompatModel,
        apiKey: local.openaiCompatApiKey,
        timeoutMs,
      });
      break;
    case "simulated":
      providers.local = simulatedProvider({ tier: "local" });
      break;
    case "none":
      break;
    default:
      throw new Error(`Unknown LOCAL_MODEL_PROVIDER "${local.provider}"`);
  }

  switch (frontier.provider) {
    case "anthropic":
      providers.frontier = anthropicProvider({ model: frontier.model, family: frontier.family, price: frontier.price, timeoutMs, apiKey: process.env.ANTHROPIC_API_KEY });
      break;
    case "simulated":
      providers.frontier = simulatedProvider({ tier: "frontier", price: frontier.price });
      break;
    case "none":
      break;
    default:
      throw new Error(`Unknown FRONTIER_PROVIDER "${frontier.provider}"`);
  }

  return providers;
}
