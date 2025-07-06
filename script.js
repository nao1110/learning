// Firebase SDKから必要な関数をインポート
// firebase/app はFirebaseアプリのコア機能を初期化するために必要です。
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// Firebase Authentication の機能は使用しないため、関連インポートは削除またはコメントアウト
// import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Cloud Firestore の機能を使うためにインポートします。
// FieldValue.increment は数値フィールドを安全に増減させるために使用します。
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// WebアプリのFirebase設定
// ここにFirebaseプロジェクトで取得した設定情報を貼り付けます。
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: "XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firebase Authenticationのインスタンスは不要なため、関連コードを削除またはコメントアウト
// const auth = getAuth(app);
// Cloud Firestoreのインスタンスを取得
const db = getFirestore(app);

// HTML要素への参照を取得
// ログイン関連の要素は削除
// const loginSection = document.getElementById('login-section');
// const appSection = document.getElementById('app-section'); // hiddenクラスを削除したため、参照は不要に
// const loginButton = document.getElementById('login-button'); // ボタンを削除したため
// const logoutButton = document.getElementById('logout-button'); // ボタンを削除したため
const userNameDisplay = document.getElementById('user-name');
const addThemeForm = document.getElementById('add-theme-form');
const themeTitleInput = document.getElementById('theme-title');
const themeGoalInput = document.getElementById('theme-goal');
const targetHoursInput = document.getElementById('target-hours');
const themesList = document.getElementById('themes-list');

// 現在のユーザー情報を保持する変数
// ログインを削除したため、ダミーのユーザー情報を設定
// 全てのデータは、このダミーのUID（例: 'guest_user'）に関連付けられます。
// 注意: この方法では、複数のユーザーが同じブラウザでアプリを使用した場合、
// 全てのデータが混在してしまいます。本番環境での利用は推奨されません。
let currentUser = { uid: "guest_user", displayName: "ゲスト" };

// ===========================================
// 認証状態の監視 (削除)
// ユーザーのログイン状態が変化したときに実行されるリスナーは不要
// ===========================================
/*
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userNameDisplay.textContent = `ようこそ、${user.displayName || user.email}さん！`;
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        document.querySelector('header nav').classList.remove('hidden');
        loadThemes();
    } else {
        currentUser = null;
        userNameDisplay.textContent = '';
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        document.querySelector('header nav').classList.add('hidden');
        themesList.innerHTML = '';
    }
});
*/

// 初期表示時にユーザー名をセット（ダミーユーザー）
if (currentUser) {
    userNameDisplay.textContent = `ようこそ、${currentUser.displayName}さん！`;
}

// ページロード時に学習テーマを読み込む関数を呼び出す
// onAuthStateChanged が無くなったため、直接呼び出す
loadThemes();


// ===========================================
// Googleログイン処理 (削除)
// ===========================================
/*
loginButton.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Googleログインエラー:", error);
        alert("ログインに失敗しました。もう一度お試しください。");
    }
});
*/

// ===========================================
// ログアウト処理 (削除)
// ===========================================
/*
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("ログアウトエラー:", error);
        alert("ログアウトに失敗しました。");
    }
});
*/

// ===========================================
// 新しい学習テーマの追加処理
// ===========================================
addThemeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ログインチェックは不要（currentUserは常に存在する）
    // if (!currentUser) {
    //     alert("ログインしていません。");
    //     return;
    // }

    const themeTitle = themeTitleInput.value.trim();
    const themeGoal = themeGoalInput.value.trim();
    const targetHours = parseInt(targetHoursInput.value, 10);

    if (themeTitle === "" || themeGoal === "" || isNaN(targetHours) || targetHours <= 0) {
        alert("全ての項目を正しく入力してください。目標学習時間は1以上の数値を入力してください。");
        return;
    }

    try {
        // Firestoreの'users/{uid}/themes'コレクションに新しいドキュメントを追加
        // currentUser.uid はダミーの 'guest_user' になる
        await addDoc(collection(db, `users/${currentUser.uid}/themes`), {
            title: themeTitle,
            goal: themeGoal,
            targetHours: targetHours,
            currentHours: 0,
            createdAt: serverTimestamp()
        });

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
    // ログインチェックは不要（currentUserは常に存在する）
    // if (!currentUser) {
    //     return;
    // }

    // ユーザーのテーマコレクションへの参照を作成 (ダミーUIDを使用)
    const userThemesCollectionRef = collection(db, `users/${currentUser.uid}/themes`);
    const q = query(userThemesCollectionRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        themesList.innerHTML = '';

        snapshot.forEach((doc) => {
            const theme = doc.data();
            const themeId = doc.id;

            const progressPercentage = theme.targetHours > 0
                ? Math.min(100, (theme.currentHours / theme.targetHours) * 100)
                : 0;

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
            themesList.innerHTML += themeCardHtml;
        });

        addEventListenersToThemeCards();
    }, (error) => {
        console.error("学習テーマの読み込みエラー:", error);
        alert("学習テーマの読み込み中に問題が発生しました。");
    });
}

// ===========================================
// 学習時間追加ボタンと削除ボタンのイベントリスナー設定関数
// ===========================================
function addEventListenersToThemeCards() {
    document.querySelectorAll('.add-hours-button').forEach(button => {
        button.onclick = async (e) => {
            const themeId = e.target.dataset.id;
            const inputElement = e.target.closest('.time-form').querySelector('.add-hours-input');
            const hoursToAdd = parseInt(inputElement.value, 10);

            if (isNaN(hoursToAdd) || hoursToAdd <= 0) {
                alert("追加する時間を正しく入力してください。（1以上の数値）");
                return;
            }

            // ログインチェックは不要
            // if (!currentUser) {
            //     alert("ログインしていません。");
            //     return;
            // }

            try {
                const themeDocRef = doc(db, `users/${currentUser.uid}/themes`, themeId); // ダミーUIDを使用
                await updateDoc(themeDocRef, {
                    currentHours: increment(hoursToAdd)
                });
                inputElement.value = '';
            } catch (error) {
                console.error("学習時間の更新エラー:", error);
                alert("学習時間の更新に失敗しました。");
            }
        };
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.onclick = async (e) => {
            if (!confirm("本当にこのテーマを削除しますか？")) {
                return;
            }
            const themeId = e.target.dataset.id;

            // ログインチェックは不要
            // if (!currentUser) {
            //     alert("ログインしていません。");
            //     return;
            // }

            try {
                const themeDocRef = doc(db, `users/${currentUser.uid}/themes`, themeId); // ダミーUIDを使用
                await deleteDoc(themeDocRef);
            } catch (error) {
                console.error("テーマの削除エラー:", error);
                alert("テーマの削除に失敗しました。");
            }
        };
    });
}