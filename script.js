// Firebase v9 compat版を使用
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket:"XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
// Cloud Firestoreのインスタンスを取得
const db = firebase.firestore();

// HTML要素への参照を取得（DOMContentLoaded後に初期化）
let userNameDisplay, addThemeForm, themeTitleInput, themeGoalInput, targetHoursInput, themesList;

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
// DOMが読み込まれた後に初期化処理を実行
document.addEventListener('DOMContentLoaded', () => {
    // HTML要素への参照を取得
    userNameDisplay = document.getElementById('user-name');
    addThemeForm = document.getElementById('add-theme-form');
    themeTitleInput = document.getElementById('theme-title');
    themeGoalInput = document.getElementById('theme-goal');
    targetHoursInput = document.getElementById('target-hours');
    themesList = document.getElementById('themes-list');
    
    // DOM要素が正しく取得できているか確認
    console.log("DOM要素チェック:");
    console.log("userNameDisplay:", userNameDisplay);
    console.log("addThemeForm:", addThemeForm);
    console.log("themeTitleInput:", themeTitleInput);
    console.log("themeGoalInput:", themeGoalInput);
    console.log("targetHoursInput:", targetHoursInput);
    console.log("themesList:", themesList);
    
    // Firebase接続テスト
    console.log("Firebase設定確認:");
    console.log("app:", app);
    console.log("db:", db);
    console.log("currentUser:", currentUser);
    
    if (currentUser && userNameDisplay) {
        userNameDisplay.textContent = `ようこそ、${currentUser.displayName}さん！`;
    }
    
    // フォームのイベントリスナーを設定
    if (addThemeForm) {
        setupFormEventListener();
    } else {
        console.error("addThemeFormが見つかりません！");
    }
    
    // 簡単なFirebase接続テスト
    testFirebaseConnection();
    
    // ページロード時に学習テーマを読み込む関数を呼び出す
    loadThemes();
});

// ===========================================
// Firebase接続テスト関数
// ===========================================
async function testFirebaseConnection() {
    console.log("=== Firebase接続テスト開始 ===");
    try {
        // テスト用のコレクション参照を作成
        const testCollectionRef = db.collection(`users/${currentUser.uid}/themes`);
        console.log("コレクション参照作成成功:", testCollectionRef);
        
        console.log("Firebase接続テスト完了：正常");
    } catch (error) {
        console.error("Firebase接続テストエラー:", error);
    }
}

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
function setupFormEventListener() {
    console.log("setupFormEventListener関数が呼ばれました");
    
    if (!addThemeForm) {
        console.error("addThemeFormが存在しません");
        return;
    }
    
    addThemeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("=== フォーム送信処理開始 ===");

        // 以下のconsole.logを追加します
        console.log("「追加する」ボタンがクリックされました。");
        
        // DOM要素の存在確認
        if (!themeTitleInput || !themeGoalInput || !targetHoursInput) {
            console.error("入力要素が見つかりません:", {
                themeTitleInput,
                themeGoalInput, 
                targetHoursInput
            });
            return;
        }

        const themeTitle = themeTitleInput.value.trim();
    const themeGoal = themeGoalInput.value.trim();
    const targetHours = parseInt(targetHoursInput.value, 10);

    // 以下のconsole.logを追加します
    console.log("取得した入力値:");
    console.log("学習テーマ:", themeTitle);
    console.log("ゴール:", themeGoal);
    console.log("目標学習時間:", targetHours);

    if (themeTitle === "" || themeGoal === "" || isNaN(targetHours) || targetHours <= 0) {
        alert("全ての項目を正しく入力してください。目標学習時間は1以上の数値を入力してください。");
        // ここでログを追加することもできます
        console.log("入力値が不正です。");
        return;
    }

    try {
        // Firestoreの'users/{uid}/themes'コレクションに新しいドキュメントを追加
        // currentUser.uid はダミーの 'guest_user' になる
        console.log("Firestoreに保存するデータ:", {
            title: themeTitle,
            goal: themeGoal,
            targetHours: targetHours,
            currentHours: 0,
            createdAt: "serverTimestamp()"
        });
        console.log("保存先パス:", `users/${currentUser.uid}/themes`);
        
        const docRef = await db.collection(`users/${currentUser.uid}/themes`).add({
            title: themeTitle,
            goal: themeGoal,
            targetHours: targetHours,
            currentHours: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 以下のconsole.logを追加します
        console.log("Firestoreへのデータ追加が成功しました！ドキュメントID:", docRef.id);

        themeTitleInput.value = '';
        themeGoalInput.value = '';
        targetHoursInput.value = '';

    } catch (error) {
        console.error("=== 学習テーマの追加エラー ===");
        console.error("エラーオブジェクト:", error);
        console.error("エラーメッセージ:", error.message);
        console.error("エラーコード:", error.code);
        console.error("エラースタック:", error.stack);
        
        // エラー発生時にもログを出力
        console.log("Firestoreへのデータ追加に失敗しました。");
        alert(`学習テーマの追加に失敗しました。エラー: ${error.message}`);
    }
        console.log("=== フォーム送信処理終了 ===");
    });
}

// ===========================================
// 学習テーマの読み込みとリアルタイム更新
// ===========================================
function loadThemes() {
    console.log("loadThemes関数が呼ばれました");
    
    // DOM要素の存在確認
    if (!themesList) {
        console.error("themes-list要素が見つかりません");
        return;
    }

    try {
        // ユーザーのテーマコレクションへの参照を作成 (ダミーUIDを使用)
        const userThemesCollectionRef = db.collection(`users/${currentUser.uid}/themes`);
        
        console.log("Firestoreからデータを取得中...");

        userThemesCollectionRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
            console.log("Firestoreからデータを受信:", snapshot.size, "件");
            themesList.innerHTML = '';

            snapshot.forEach((doc) => {
                const theme = doc.data();
                const themeId = doc.id;
                
                console.log("テーマデータ:", theme);

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
    } catch (error) {
        console.error("loadThemes関数でエラーが発生:", error);
    }
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
                const themeDocRef = db.collection(`users/${currentUser.uid}/themes`).doc(themeId);
                await themeDocRef.update({
                    currentHours: firebase.firestore.FieldValue.increment(hoursToAdd)
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
                const themeDocRef = db.collection(`users/${currentUser.uid}/themes`).doc(themeId);
                await themeDocRef.delete();
            } catch (error) {
                console.error("テーマの削除エラー:", error);
                alert("テーマの削除に失敗しました。");
            }
        };
    });
}