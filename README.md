# Bredlyn
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/akifune13/bredlyn)

Bredlyn is a feature-rich Discord bot designed to fetch and display user statistics from the popular rhythm game, osu!. It integrates directly with the osu! API v2 to provide up-to-date, interactive information on user profiles and top plays.

## Features

*   **User Profiles**: Get a detailed summary of any osu! user's profile, including rank, performance points (pp), accuracy, play count, and grade statistics.
*   **Top Plays**: Browse a user's top 100 plays through an interactive, paginated embed.
*   **Mod-Adjusted Star Rating**: Top play displays include accurately calculated star ratings based on the mods used for each score.
*   **Account Linking**: Link your Discord account to your osu! username to check your own stats without typing your name every time.
*   **Customizable Prefix**: The bot's command prefix can be changed to avoid conflicts with other bots.

## Commands

The default prefix is `<`.

| Command                          | Aliases              | Description                                                                     |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `profile [username]`             |                      | Displays the osu! profile for the specified user or your linked account.        |
| `top [username] [page <number>]` | `topplays`, `osutop` | Shows a paginated list of top plays for the specified user or your linked account. |
| `link <username>`                |                      | Links your Discord account to an osu! username.                                 |
| `unlink`                         |                      | Unlinks your osu! account.                                                      |
| `setprefix <new_prefix>`         |                      | Sets a new command prefix for the bot.                                          |

## Setup and Installation

To run your own instance of Bredlyn, follow these steps:

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/akifune13/bredlyn.git
    cd bredlyn
    ```

2.  **Install dependencies:**
    ```sh
    npm install discord.js dotenv node-fetch axios quick-lru
    ```

3.  **Configure environment variables:**
    Create a file named `.env` in the root directory and add your credentials. You will need a Discord Bot Token and osu! API v2 credentials.

    ```env
    DISCORD_TOKEN=your_discord_bot_token
    OSU_CLIENT_ID=your_osu_client_id
    OSU_CLIENT_SECRET=your_osu_client_secret
    ```

4.  **(Optional) Add Custom Grade Emojis:**
    To display custom emojis for score grades, create a file named `emojis.json` in the root directory. The bot will fall back to text if this file is not present.

    *Example `emojis.json`:*
    ```json
    {
      "ssh": "<:SSH:123456789012345678>",
      "ss": "<:SS:123456789012345678>",
      "sh": "<:SH:123456789012345678>",
      "s": "<:S:123456789012345678>",
      "a": "<:A:123456789012345678>"
    }
    ```

5.  **Start the bot:**
    ```sh
    npm start
    ```

## Configuration

The default command prefix can be changed by editing the `defaultPrefix` value in `config.json`. This can also be changed at runtime using the `setprefix` command.

```json
{
  "defaultPrefix": "<"
}
