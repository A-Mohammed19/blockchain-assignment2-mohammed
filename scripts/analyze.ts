import { artifacts } from "hardhat";
import { createPublicClient, http, decodeEventLog } from "viem";

const RPC_URL = process.env.RPC_URL!;
const CHAIN_ID = Number(process.env.CHAIN_ID!);

// Paste from interact output
const HASHES = {
  tx1: "0x934d35da6ab44c789b6fcdd7b875ab4469f1ac9f7ab151a39e5ae458d1789281",
  tx2: "0x6151210060b708d5b26242124261036be4b70ea086b032c14a4691697576ba25",
  tx3: "0xe97ef1d34bfa240a844511b623eaa85ca6701246c110d63d4a4698e5e2f3a2a2",
};

// Define a type for the decoded event
interface DecodedEvent {
  eventName: string;
  args: any;
}

async function analyze(hash: `0x${string}`, abi: any) {
  const chain = { 
    id: CHAIN_ID, 
    name: `localhost`, 
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, 
    rpcUrls: { default: { http: [RPC_URL] } } 
  };
  const pc = createPublicClient({ chain, transport: http(RPC_URL) });

  const tx = await pc.getTransaction({ hash });
  const rcpt = await pc.getTransactionReceipt({ hash });
  const block = await pc.getBlock({ blockNumber: rcpt.blockNumber });

  const baseFee = block.baseFeePerGas ?? 0n;
  const gasUsed = rcpt.gasUsed ?? 0n;
  const effective = rcpt.effectiveGasPrice ?? tx.gasPrice ?? 0n;
  const totalFee = gasUsed * effective;
  console.log(`\n=== ${hash} ===`);
  console.log("Status:", rcpt.status === "success" ? "Success" : "Fail");
  console.log("Block:", rcpt.blockNumber);
  console.log("Timestamp (UTC):", new Date(Number(block.timestamp) * 1000).toISOString());
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Nonce:", tx.nonce);
  console.log("Gas limit:", tx.gas);
  console.log("Gas used:", gasUsed);
  console.log("Base fee per gas:", baseFee);
  console.log("Max fee per gas:", tx.maxFeePerGas ?? 0n);
  console.log("Max priority fee per gas:", tx.maxPriorityFeePerGas ?? 0n);
  console.log("Effective gas price:", effective);
  console.log("Total fee (wei):", totalFee);

  for (const log of rcpt.logs) {
    try {
      const parsed = decodeEventLog({ abi, data: log.data, topics: log.topics }) as DecodedEvent;
      console.log("Event:", parsed.eventName, parsed.args);
    } catch { /* not a CampusCredit event */ }
  }
}

async function main() {
  const { abi } = await artifacts.readArtifact("CampusCredit");
  await analyze(HASHES.tx1 as `0x${string}`, abi);
  await analyze(HASHES.tx2 as `0x${string}`, abi);
  await analyze(HASHES.tx3 as `0x${string}`, abi);
}

main().catch((e) => { console.error(e); process.exit(1); });