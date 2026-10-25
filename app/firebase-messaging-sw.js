// Pushes while the web app is closed (Firebase Cloud Messaging, lib/core/push.dart):
// Firebase shows each one itself, and a tap opens the link the server gave it
// (supabase/functions/push). The version is firebase_core_web's JS SDK; the
// settings are AppConfig.firebaseWeb.
importScripts('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBPZ3CdEYnOenH1jPmd2kcP71asNmHNz1g',
  appId: '1:604540020793:web:67de7263ac3641557a45e8',
  messagingSenderId: '604540020793',
  projectId: 'repuchat',
  authDomain: 'repuchat.firebaseapp.com',
  storageBucket: 'repuchat.firebasestorage.app',
});
firebase.messaging();
