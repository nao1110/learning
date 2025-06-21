// Firebase SDKから必要な関数をインポート
// firebase/app はFirebaseアプリのコア機能を初期化するために必要です。
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// Firebase Authentication の機能を使うためにインポートします。
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Cloud Firestore の機能を使うためにインポートします。
// FieldValue.increment は数値フィールドを安全に増減させるために使用します。
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// WebアプリのFirebase設定
// ここにFirebaseプロジェクトで取得した設定情報を貼り付けます。
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: ""XXX",
  messagingSenderId: "XXX",
  appId: ""XXX"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firebase Authenticationのインスタンスを取得
const auth = getAuth(app);
// Cloud Firestoreのインスタンスを取得
const db = getFirestore(app);

// HTML要素への参照を取得（後でJavaScriptから操作するために必要）
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userNameDisplay = document.getElementById('user-name');
const addThemeForm = document.getElementById('add-theme-form');
const themeTitleInput = document.getElementById('theme-title');
const themeGoalInput = document.getElementById('theme-goal');
const targetHoursInput = document.getElementById('target-hours');
const themesList = document.getElementById('themes-list');

// 現在のユーザー情報を保持する変数
let currentUser = null;

// ===========================================
// 認証状態の監視
// ユーザーのログイン状態が変化したときに実行されるリスナー
// ===========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ユーザーがログインしている場合
        currentUser = user; // ログインユーザー情報を保存
        userNameDisplay.textContent = `ようこそ、${user.displayName || user.email}さん！`; // ユーザー名を表示
        loginSection.classList.add('hidden'); // ログインセクションを非表示
        appSection.classList.remove('hidden'); // アプリセクションを表示
        document.querySelector('header nav').classList.remove('hidden'); // ヘッダーのユーザー情報を表示

        // ログイン後に学習テーマを読み込む関数を呼び出す
        loadThemes();

    } else {
        // ユーザーがログアウトしている場合
        currentUser = null; // ユーザー情報をクリア
        userNameDisplay.textContent = ''; // ユーザー名をクリア
        loginSection.classList.remove('hidden'); // ログインセクションを表示
        appSection.classList.add('hidden'); // アプリセクションを非表示
        document.querySelector('header nav').classList.add('hidden'); // ヘッダーのユーザー情報を非表示

        // ログアウト時に表示されているテーマをクリアする
        themesList.innerHTML = '';
    }
});

// ===========================================
// Googleログイン処理
// ===========================================
loginButton.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider(); // Google認証プロバイダーを作成
    try {
        await signInWithPopup(auth, provider); // ポップアップでログインを実行
        // ログイン成功はonAuthStateChangedで処理されるため、ここでは明示的に何もしなくてよい
    } catch (error) {
        console.error("Googleログインエラー:", error);
        alert("ログインに失敗しました。もう一度お試しください。");
    }
});

// ===========================================
// ログアウト処理
// ===========================================
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth); // ログアウトを実行
        // ログアウト成功はonAuthStateChangedで処理されるため、ここでは明示的に何もしなくてよい
    } catch (error) {
        console.error("ログアウトエラー:", error);
        alert("ログアウトに失敗しました。");
    }
});

// ===========================================
// 新しい学習テーマの追加処理
// ===========================================
addThemeForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // フォームのデフォルト送信（ページのリロード）を防ぐ

    if (!currentUser) {
        alert("ログインしていません。");
        return;
    }

    const themeTitle = themeTitleInput.value.trim(); // 学習テーマの入力値を取得し、前後の空白を除去
    const themeGoal = themeGoalInput.value.trim();   // ゴールの入力値を取得し、前後の空白を除去
    const targetHours = parseInt(targetHoursInput.value, 10); // 目標学習時間を数値として取得（10進数）

    // 入力値のバリデーション（空でないか、数値が正しいか）
    if (themeTitle === "" || themeGoal === "" || isNaN(targetHours) || targetHours <= 0) {
        alert("全ての項目を正しく入力してください。目標学習時間は1以上の数値を入力してください。");
        return;
    }

    try {
        // Firestoreの'users/{uid}/themes'コレクションに新しいドキュメントを追加
        // ログインユーザーのID (currentUser.uid) をパスに含めることで、ユーザーごとにデータを分離
        await addDoc(collection(db, `users/${currentUser.uid}/themes`), {
            title: themeTitle,
            goal: themeGoal,
            targetHours: targetHours,
            currentHours: 0, // 現在の学習時間は初期値0
            createdAt: serverTimestamp() // サーバー側でドキュメントが作成された時刻を記録
        });

        // フォームをクリア
        themeTitleInput.value = '';
        themeGoalInput.value = '';
        targetHoursInput.value = '';

    } catch (error) {
        console.error("学習テーマの追加エラー:", error);
        alert("学習テーマの追加に失敗しました。");
    }
});

// ===========================================
// 学習テーマの読み込みとリアルタイム更新
// ===========================================
function loadThemes() {
    if (!currentUser) {
        return; // ユーザーがログインしていない場合は何もしない
    }

    // ユーザーのテーマコレクションへの参照を作成
    const userThemesCollectionRef = collection(db, `users/${currentUser.uid}/themes`);
    // 作成日時 (createdAt) で降順（新しいものが上）に並び替えるクエリを作成
    const q = query(userThemesCollectionRef, orderBy("createdAt", "desc"));

    // リアルタイムリスナーを設定
    // onSnapshotは、クエリ結果に変更があるたびに、このコールバック関数を実行します。
    onSnapshot(q, (snapshot) => {
        themesList.innerHTML = ''; // 一旦リスト表示エリアの中身を全てクリア

        // スナップショット内の各ドキュメント（学習テーマ）を処理
        snapshot.forEach((doc) => {
            const theme = doc.data(); // ドキュメントのデータ（オブジェクト）を取得
            const themeId = doc.id;   // ドキュメントのユニークなIDを取得

            // プログレスバーの進行状況を計算
            // 目標時間が0の場合のNaNやInfinityを避けるため、条件分岐で0%に設定
            const progressPercentage = theme.targetHours > 0 
                ? Math.min(100, (theme.currentHours / theme.targetHours) * 100) // 100%を超えないように制限
                : 0;

            // 各学習テーマの表示用HTML文字列を作成
            const themeCardHtml = `
                <div class="card theme-card" data-id="${themeId}">
                    <button class="delete-button" data-id="${themeId}">&times;</button>
                    <h4>${theme.title}</h4>
                    <p class="goal">目標：${theme.goal}</p>
                    <div class="progress-info">
                        <span>学習時間: ${theme.currentHours} / ${theme.targetHours} 時間</span>
                        <span>${progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-inner" style="width: ${progressPercentage}%;"></div>
                    </div>
                    <div class="time-form">
                        <input type="number" class="add-hours-input" placeholder="追加時間" min="1">
                        <button class="add-hours-button" data-id="${themeId}">時間追加</button>
                    </div>
                </div>
            `;
            themesList.innerHTML += themeCardHtml; // 作成したHTMLをリスト表示エリアに追加
        });

        // 動的に追加された要素（時間追加ボタン、削除ボタン）にイベントリスナーを設定する
        // onSnapshotが実行されるたびにDOMが再構築されるため、イベントリスナーも毎回設定し直す必要があります。
        addEventListenersToThemeCards();
    }, (error) => {
        // データの読み込み中にエラーが発生した場合のハンドリング
        console.error("学習テーマの読み込みエラー:", error);
        alert("学習テーマの読み込み中に問題が発生しました。");
    });
}

// ===========================================
// 学習時間追加ボタンと削除ボタンのイベントリスナー設定関数
// ===========================================
function addEventListenersToThemeCards() {
    // 全ての「時間追加」ボタンに対してイベントリスナーを設定
    document.querySelectorAll('.add-hours-button').forEach(button => {
        // addEventListenerではなくonclickを使うことで、
        // onSnapshotが走るたびにイベントリスナーが重複して追加されるのを防ぎます。
        // （既に設定されていたイベントリスナーは上書きされます）
        button.onclick = async (e) => { 
            const themeId = e.target.dataset.id; // ボタンのdata-id属性からテーマIDを取得
            // input要素はボタンの最も近い親要素（.time-form）の中から探す
            const inputElement = e.target.closest('.time-form').querySelector('.add-hours-input');
            const hoursToAdd = parseInt(inputElement.value, 10); // 入力値を数値として取得（10進数）

            // 入力値のバリデーション
            if (isNaN(hoursToAdd) || hoursToAdd <= 0) {
                alert("追加する時間を正しく入力してください。（1以上の数値）");
                return;
            }

            if (!currentUser) {
                alert("ログインしていません。");
                return;
            }

            try {
                // 更新するドキュメントへの参照を取得
                const themeDocRef = doc(db, `users/${currentUser.uid}/themes`, themeId);
                // currentHoursフィールドにhoursToAddの値を原子的に加算して更新
                // Firestoreのincrement関数を使うことで、現在の値を読み込むことなく安全に加算できます。
                // これにより、複数のユーザーが同時に更新しても競合が起きにくいです。
                await updateDoc(themeDocRef, {
                    currentHours: increment(hoursToAdd) 
                });
                inputElement.value = ''; // 入力欄をクリア
            } catch (error) {
                console.error("学習時間の更新エラー:", error);
                alert("学習時間の更新に失敗しました。");
            }
        };
    });

    // 全ての「削除」ボタンに対してイベントリスナーを設定
    document.querySelectorAll('.delete-button').forEach(button => {
        // 同様にonclickを使ってイベントリスナーの重複を防ぐ
        button.onclick = async (e) => { 
            // 削除前にユーザーに確認を求めるポップアップを表示
            if (!confirm("本当にこのテーマを削除しますか？")) { 
                return; // 「キャンセル」が選択されたら処理を中断
            }
            const themeId = e.target.dataset.id; // ボタンのdata-id属性からテーマIDを取得

            if (!currentUser) {
                alert("ログインしていません。");
                return;
            }

            try {
                // 削除するドキュメントへの参照を取得
                const themeDocRef = doc(db, `users/${currentUser.uid}/themes`, themeId);
                await deleteDoc(themeDocRef); // ドキュメントをFirestoreから削除
                // 削除成功はonSnapshotで自動的に画面に反映されるため、ここでは明示的なDOM操作は不要
            } catch (error) {
                console.error("テーマの削除エラー:", error);
                alert("テーマの削除に失敗しました。");
            }
        };
    });
}