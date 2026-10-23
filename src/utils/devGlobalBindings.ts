
import { auth as fbAuth, db as fbDb, storage as fbStorage } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc as fbDoc, setDoc as fbSetDoc, getDoc as fbGetDoc, collection as fbCollection, query as fbQuery, where as fbWhere, getDocs as fbGetDocs, updateDoc as fbUpdateDoc } from 'firebase/firestore';
import { ref as fbRef, listAll as fbListAll, getDownloadURL as fbGetDownloadURL } from 'firebase/storage';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useTransportStore } from '../stores/useTransportStore';
import { channels, busChannels } from '../audio/effectsChain';
import * as Tone from 'tone';
import * as effectsChain from '../audio/effectsChain';

export function setupDevGlobalBindings(): void {
  if (typeof window === 'undefined') return;

  (window as any).Tone = Tone;
  (window as any).useSequencerStore = useSequencerStore;
  (window as any).__EFFECTS_CHAIN__ = effectsChain;

  // @ts-ignore
  window.firebaseAuth = fbAuth;
  // @ts-ignore
  window.firebaseDb = fbDb;
  // @ts-ignore
  window.firebaseStorage = fbStorage;
  // @ts-ignore
  window.storageRef = fbRef;
  // @ts-ignore
  window.storageListAll = fbListAll;
  // @ts-ignore
  window.storageGetDownloadURL = fbGetDownloadURL;
  // @ts-ignore
  window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
  // @ts-ignore
  window.signInWithEmailAndPassword = signInWithEmailAndPassword;
  // @ts-ignore
  window.setDoc = fbSetDoc;
  // @ts-ignore
  window.doc = fbDoc;
  // @ts-ignore
  window.getDoc = fbGetDoc;
  // @ts-ignore
  window.collection = fbCollection;
  // @ts-ignore
  window.query = fbQuery;
  // @ts-ignore
  window.where = fbWhere;
  // @ts-ignore
  window.getDocs = fbGetDocs;
  // @ts-ignore
  window.updateDoc = fbUpdateDoc;

  if (import.meta.env.DEV || typeof window !== 'undefined') {
    (window as any).useSequencerStore = useSequencerStore;
    (window as any).__SEQUENCER_STORE__ = useSequencerStore;
    (window as any).__AUDIO_STORE__ = useAudioStore;
    (window as any).__TRANSPORT_STORE__ = useTransportStore;
    (window as any).__CHANNELS__ = channels;
    (window as any).__BUS_CHANNELS__ = busChannels;
  }
}
