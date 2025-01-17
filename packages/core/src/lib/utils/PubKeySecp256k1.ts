import { Hash } from './Hash';
import CryptoJS from 'crypto-js';
import { ec } from 'elliptic';
import { Buffer } from 'buffer/';

export class PubKeySecp256k1 {
	constructor(protected readonly pubKey: Uint8Array) {
		if (pubKey.length !== 33 && pubKey.length !== 65) {
			throw new Error(`Invalid length of public key: ${pubKey.length}`);
		}
	}

	toBytes(uncompressed?: boolean): Uint8Array {
		if (uncompressed && this.pubKey.length === 65) {
			return this.pubKey;
		}
		if (!uncompressed && this.pubKey.length === 33) {
			return this.pubKey;
		}

		const keyPair = this.toKeyPair();
		if (uncompressed) {
			return new Uint8Array(Buffer.from(keyPair.getPublic().encode('hex', false), 'hex'));
		} else {
			return new Uint8Array(Buffer.from(keyPair.getPublic().encodeCompressed('hex'), 'hex'));
		}
	}

	/**
	 * @deprecated Use `getCosmosAddress()` instead.
	 */
	getAddress(): Uint8Array {
		return this.getCosmosAddress();
	}

	getCosmosAddress(): Uint8Array {
		let hash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(this.toBytes(false) as any)).toString();
		hash = CryptoJS.RIPEMD160(CryptoJS.enc.Hex.parse(hash)).toString();

		return new Uint8Array(Buffer.from(hash, 'hex'));
	}

	getEthAddress(): Uint8Array {
		// Should be uncompressed.
		// And remove prefix byte.
		// And hash by keccak256.
		// Use last 20 bytes.
		return Hash.keccak256(this.toBytes(true).slice(1)).slice(-20);
	}

	toKeyPair(): ec.KeyPair {
		const secp256k1 = new ec('secp256k1');

		return secp256k1.keyFromPublic(Buffer.from(this.pubKey).toString('hex'), 'hex');
	}

	verifyDigest32(digest: Uint8Array, signature: Uint8Array): boolean {
		if (digest.length !== 32) {
			throw new Error(`Invalid length of digest to verify: ${digest.length}`);
		}

		if (signature.length !== 64) {
			throw new Error(`Invalid length of signature: ${signature.length}`);
		}

		const secp256k1 = new ec('secp256k1');

		const r = signature.slice(0, 32);
		const s = signature.slice(32);

		return secp256k1.verify(
			digest,
			{
				r: Buffer.from(r).toString('hex'),
				s: Buffer.from(s).toString('hex')
			},
			this.toKeyPair()
		);
	}
}
