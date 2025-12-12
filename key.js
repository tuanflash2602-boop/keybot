const mineflayer = require("mineflayer");
const readline = require("readline");
const { ProxyAgent } = require("proxy-agent");

// Danh sách 4 bot
const accounts = [
  { username: "conmeo1", password: "velotreo1" },
  { username: "conmeo2", password: "velotreo1" },
  { username: "conmeo3", password: "velotreo1" },
  { username: "conmeo4", password: "velotreo1" }
];

// Danh sách proxy (SOCKS5 hoặc HTTP)
const proxies = [
  "socks5://127.0.0.1:1080",
  "socks5://127.0.0.1:1081",
  "socks5://127.0.0.1:1082",
  "socks5://127.0.0.1:1083"
];

const bots = [];
const globalStartTime = Date.now();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Đếm số lượng tripwire_hook
function countTripwire(bot) {
  if (!bot.inventory) return 0;
  return bot.inventory.items().reduce((sum, item) => item.name === "tripwire_hook" ? sum + item.count : sum, 0);
}

// Tạo bot với proxy
function createBot(account, botIndex) {
  // Chọn proxy ngẫu nhiên
  const proxy = proxies[Math.floor(Math.random() * proxies.length)];

  const bot = mineflayer.createBot({
    host: "kingmc.vn",
    username: account.username,
    version: "1.20",
    agent: new ProxyAgent(proxy)
  });

  let onlineStartTime = Date.now();
  let reconnectCountdown = 0;
  let tps = 20;

  const botObj = { bot, account, onlineStartTime, reconnectCountdown, tps, proxy };
  bots.push(botObj);

  bot.once("login", () => bot.chat(`/login ${account.password}`));

  bot.once("spawn", async () => {
    onlineStartTime = Date.now();
    bot.setQuickBarSlot(4);

    const endTime = Date.now() + 1000;
    const spam = setInterval(() => {
      bot.activateItem();
      if (Date.now() > endTime) clearInterval(spam);
    }, 400);

    await sleep(1200);
    bot.clickWindow(20, 0, 0); // click slot 20 xong

    // Di chuyển vòng tròn
    const directions = ["forward", "back", "left", "right"];
    let dirIndex = botIndex % directions.length;

    setInterval(() => {
      const dir = directions[dirIndex];
      bot.setControlState(dir, true);
      setTimeout(() => bot.setControlState(dir, false), 2000);
      dirIndex = (dirIndex + 1) % directions.length;
    }, 3000);
  });

  bot.on("end", () => {
    reconnectCountdown = 5;
    console.log(`${account.username} mất kết nối, reconnect với proxy mới...`);
    setTimeout(() => createBot(account, botIndex), 5000); // reconnect với proxy khác
  });

  return bot;
}

// Tạo tất cả bot
accounts.forEach((acc, index) => createBot(acc, index));

// Chat từ terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", async (input) => {
  input = input.trim();
  if (input.startsWith("/bot")) {
    const [cmd, ...msgParts] = input.split(" ");
    const msg = msgParts.join(" ");
    const botIndex = parseInt(cmd.replace("/bot", "")) - 1;
    if (bots[botIndex]) bots[botIndex].bot.chat(msg);
  } else {
    for (const { bot } of bots) {
      if (bot && bot.chat) bot.chat(input);
      await sleep(500);
    }
  }
});

// Bảng trạng thái update tại chỗ, mỗi 30s
setInterval(() => {
  process.stdout.write('\x1b[H\x1b[2J');
  const totalRunTime = Math.floor((Date.now() - globalStartTime)/1000);
  console.log(`==== Bot Status (Runtime: ${totalRunTime}s) ====`);
  console.log("Bot | Pos | Online | Reconnect | TPS | Tripwire_Hook | Proxy");

  bots.forEach(({ bot, account, onlineStartTime, reconnectCountdown, tps, proxy }) => {
    const pos = bot.entity?.position;
    const coords = pos ? `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}` : "???";
    const onlineTime = Math.floor((Date.now() - onlineStartTime)/1000) + "s";
    const reconnect = bot.isConnected ? "-" : reconnectCountdown + "s";
    const tripCount = countTripwire(bot);
    console.log(`${account.username} | ${coords} | ${onlineTime} | ${reconnect} | ${tps} | ${tripCount} | ${proxy}`);
  });

  console.log("====================================\n");
}, 30000);
