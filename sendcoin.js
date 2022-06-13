const axios  = require('axios')
const bitcore =  require('bitcore-lib')
const sendBitcoin = async(sender, receipients, amount, private_key) => {
	
	const network = 'BTC'
	const privateKey = private_key ;
	const source = sender

	const amount_in_satoshi = amount 
	let fee = 0;
	let inputcount = 0;
	let outputcount = 0;

	const unspent_output = await axios.get(
		`https://chain.so/api/v2/get_tx_unspent/${network}/${sender}`
	);
	const transaction = new bitcore.Transaction()
	let totalamountavailable = 0;
	let inputs = [];
	unspent_output.data.data.txs.forEach(tx => {
		let utxo = {}
		utxo.satoshis = Math.floor(Number(tx.value) * 100000000);
		utxo.script = tx.script_hex
		utxo.address = unspent_output.data.data.address;
		utxo.txId = tx.txid;
		utxo.outputIndex = tx.output_no
		totalamountavailable += utxo.satoshis
		inputcount += 1
		inputs.push(utxo)
	})
	console.log(inputs, inputcount);

	const transactionSize = inputcount * 146 * outputcount * 34 + 10 - inputcount;
	fee = transactionSize * 20
	
	if (totalamountavailable - amount_in_satoshi - fee < 0) {
		throw new Error('Balance is too low for this transaction')
	}

	transaction.from(inputs)

	transaction.to(receipients, amount_in_satoshi)
	transaction.change(sender)
	transaction.fee(fee * 20)
	transaction.sign(privateKey)
	const serializedTransaction = transaction.serialize()

	const res = await axios({
		method: "POST",
		url: `https://chain.so/api/v2/send_tx/${network}`,
		data: {
			tx_hex: serializedTransaction,
		}
	});

	return res.data
}

module.exports = sendBitcoin
