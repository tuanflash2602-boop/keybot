const mineflayer = require("mineflayer");
const readline = require("readline");

// Danh sách 4 bot
const accounts = [
  { username: "conmeo1", password: "velotreo1" },
  { username: "conmeo2", password: "velotreo1" },
  { username: "conmeo3", password: "velotreo1" },
  { username: "conmeo4", password: "velotreo1" }
];

const bots = [];
const globalStartTime = Date.now();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm đếm số lượng tripwire_hook trong inventory
function countTripwire(bot) {
  if (!bot.inventory) return 0;
  return bot.inventory.items().reduce((sum, item) => item.name === "tripwire_hook" ? sum + item.count : sum, 0);
}

function createBot(account, botIndex) {
  const bot = mineflayer.createBot({
    host: "kingmc.vn",
    username: account.username,
    version: "1.20"
  });

  let onlineStartTime = Date.now();
  let reconnectCountdown = 0;
  let tps = 20;

  const botObj = { bot, account, onlineStartTime, reconnectCountdown, tps };
  bots.push(botObj);

  // Login tự động
  bot.once("login", () => bot.chat(`/login ${account.password}`));

  // Khi bot spawn
  bot.once("spawn", async () => {
    onlineStartTime = Date.now();
    bot.setQuickBarSlot(4);

    // Spam click ngắn để mở menu
    const endTime = Date.now() + 1000;
    const spam = setInterval(() => {
      bot.activateItem();
      if (Date.now() > endTime) clearInterval(spam);
    }, 400);
});

  bot.on("windowOpen", async (window) => { 
    await sleep(1200);         // đợi menu mở xong
    bot.clickWindow(20, 0, 0); // click slot 20 (xong)

    // --- Di chuyển vòng tròn khác nhau cho từng bot ---
    const directions = ["forward", "back", "left", "right"];
    let dirIndex = botIndex % directions.length;

    setInterval(() => {
      const dir = directions[dirIndex];
      bot.setControlState(dir, true);
      setTimeout(() => bot.setControlState(dir, false), 2000); // đi 2s rồi dừng
      dirIndex = (dirIndex + 1) % directions.length;
    }, 3000);
  });

  // Khi mất kết nối
  bot.on("end", () => {
    reconnectCountdown = 5;
    setTimeout(() => createBot(account, botIndex), 5000);
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
  process.stdout.write('\x1b[H\x1b[2J'); // xóa bảng cũ
  const totalRunTime = Math.floor((Date.now() - globalStartTime)/1000);
  console.log(`==== Bot Status (Runtime: ${totalRunTime}s) ====`);
  console.log("Bot | Pos | Online | Reconnect | TPS | Tripwire_Hook");

  bots.forEach(({ bot, account, onlineStartTime, reconnectCountdown, tps }) => {
    const pos = bot.entity?.position;
    const coords = pos ? `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}` : "???";
    const onlineTime = Math.floor((Date.now() - onlineStartTime)/1000) + "s";
    const reconnect = bot.isConnected ? "-" : reconnectCountdown + "s";
    const tripCount = countTripwire(bot);
    console.log(`${account.username} | ${coords} | ${onlineTime} | ${reconnect} | ${tps} | ${tripCount}`);
  });

  console.log("====================================\n");
}, 30000);
