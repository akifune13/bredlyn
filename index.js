import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import url from "url";

config();

// Load config.json
const configFile = JSON.parse(fs.readFileSync("./config.json", "utf-8"));

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Setup commands and prefix
client.commands = new Collection();
client.prefix = configFile.defaultPrefix || "!";

// Load all command files
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const commandModule = await import(`./commands/${file}`);
  const commandName = (commandModule.data && commandModule.data.name) || file.replace(".js", "");
  const execute = commandModule.execute;

  if (!execute) {
    console.warn(`Command file ${file} has no execute function, skipping.`);
    continue;
  }

  client.commands.set(commandName.toLowerCase(), { data: commandModule.data, execute });
}


// Bot ready
client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Handle message commands
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(client.prefix)) return;

  const args = message.content.slice(client.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    // Create a fake interaction for compatibility with execute()
    const interaction = {
    reply: (msg) => message.reply(msg),
    deferReply: async () => {},
    editReply: async (msg) => message.reply(msg),
    options: {
        getString: (name) => args.join(" ")
    },
    message,
    client // <-- add this
    };


    await command.execute(interaction, args);
  } catch (err) {
    console.error(err);
    message.reply("There was an error executing this command.");
  }
});

client.login(process.env.DISCORD_TOKEN);
