// Remplace le stockage local par Firebase Firestore, pour une vraie
// synchronisation entre tous les appareils utilisant cette appli.
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDlZJdoeS1FXDxt7wQGQK6H9PUuEAWfHao",
  authDomain: "nid-hakima-e57d6.firebaseapp.com",
  projectId: "nid-hakima-e57d6",
  storageBucket: "nid-hakima-e57d6.firebasestorage.app",
  messagingSenderId: "246703089322",
  appId: "1:246703089322:web:bf66b546cef7255ac112d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function docId(key, shared) {
  return key + (shared ? "__shared" : "");
}

window.storage = {
  async get(key, shared = false) {
    const ref = doc(db, "nid", docId(key, shared));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("not found");
    return { key, value: snap.data().value, shared };
  },

  async set(key, value, shared = false) {
    const ref = doc(db, "nid", docId(key, shared));
    await setDoc(ref, { value });
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const ref = doc(db, "nid", docId(key, shared));
    await deleteDoc(ref);
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    const snap = await getDocs(collection(db, "nid"));
    const keys = [];
    snap.forEach((d) => {
      if (d.id.startsWith(prefix)) keys.push(d.id);
    });
    return { keys, prefix, shared };
  },
};
