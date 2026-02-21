const app = require("./src/app");
const { PORT, SOLANA_NETWORK } = require("./src/config");

app.listen(PORT, () => {
    console.log(`\n🚀 FlashTip backend running on http://localhost:${PORT}`);
    console.log(`   Network: ${SOLANA_NETWORK}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /api/health`);
    console.log(`     GET  /api/creator/:channelName`);
    console.log(`     POST /api/build-transaction`);
    console.log(`     POST /api/record-tip`);
    console.log(`     POST /api/dashboard/data`);
    console.log(`     POST /api/dashboard/create-indexes\n`);
});
