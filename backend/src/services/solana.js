const { PublicKey, Transaction, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { connection, MEMO_PROGRAM_ID } = require("../config");

const buildTransferTransaction = async ({ fromAddress, toAddress, solAmount, memo }) => {
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

    // Fetch latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Build transaction
    const tx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: fromPubkey,
    });

    // SOL transfer instruction
    tx.add(
        SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
        })
    );

    // Memo instruction (optional on-chain message)
    if (memo && memo.trim()) {
        tx.add(
            new TransactionInstruction({
                keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: false }],
                programId: MEMO_PROGRAM_ID,
                data: Buffer.from(memo.trim(), "utf-8"),
            })
        );
    }

    // Serialize (without signatures — Phantom will sign)
    const serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });

    return {
        base64Tx: serialized.toString("base64"),
        blockhash,
        lastValidBlockHeight,
    };
};

module.exports = { buildTransferTransaction };
