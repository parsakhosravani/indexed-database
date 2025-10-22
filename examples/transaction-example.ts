/**
 * Transaction example - multiple operations atomically
 */

import { IndexedDatabase } from '../src';

interface User {
  id?: number;
  name: string;
  balance: number;
}

async function transferMoney() {
  const db = new IndexedDatabase({
    dbName: 'bankDB',
    version: 1,
    stores: [
      {
        name: 'users',
        keyPath: 'id',
        autoIncrement: true,
      },
    ],
  });

  await db.open();

  // Add initial users
  await db.add<User>('users', { name: 'Alice', balance: 1000 });
  await db.add<User>('users', { name: 'Bob', balance: 500 });

  // Transfer money atomically
  await db.transaction(['users'], 'readwrite', async (tx, [store]) => {
    const aliceRequest = store.get(1);
    const bobRequest = store.get(2);

    const alice = await new Promise<User>((resolve, reject) => {
      aliceRequest.onsuccess = () => resolve(aliceRequest.result);
      aliceRequest.onerror = () => reject(aliceRequest.error);
    });

    const bob = await new Promise<User>((resolve, reject) => {
      bobRequest.onsuccess = () => resolve(bobRequest.result);
      bobRequest.onerror = () => reject(bobRequest.error);
    });

    // Transfer $200 from Alice to Bob
    const amount = 200;

    if (alice.balance < amount) {
      throw new Error('Insufficient funds');
    }

    alice.balance -= amount;
    bob.balance += amount;

    store.put(alice);
    store.put(bob);

    console.log('Transfer successful!');
  });

  // Verify balances
  const alice = await db.get<User>('users', 1);
  const bob = await db.get<User>('users', 2);

  console.log('Alice balance:', alice?.balance); // 800
  console.log('Bob balance:', bob?.balance); // 700

  db.close();
}

transferMoney().catch(console.error);
