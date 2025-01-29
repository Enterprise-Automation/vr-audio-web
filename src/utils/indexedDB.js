export function openDatabase() {
    console.log('openDatabase');
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('audioAppDB', 5);

        request.onupgradeneeded = (event) => {
            console.log('onupgradeneeded');
            const db = event.target.result;
            if (!db.objectStoreNames.contains('audioClips')) {
                db.createObjectStore('audioClips', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('websocketResponses')) {
                db.createObjectStore('websocketResponses', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('intents')) {
                const intentStore = db.createObjectStore('intents', { keyPath: 'id', autoIncrement: true });
                const initialIntents = [
                    { "text": "What's your name?", "label": 0 },
                    { "text": "May I know your name?", "label": 0 },
                    { "text": "Could you tell me your name?", "label": 0 },
                    { "text": "Who am I speaking with?", "label": 0 },
                    { "text": "What should I call you?", "label": 0 },
                    { "text": "Can you share your name with me?", "label": 0 },
                    { "text": "How should I address you?", "label": 0 },
                    { "text": "Your name, please?", "label": 0 },
                    { "text": "Could you introduce yourself?", "label": 0 },
                    { "text": "Can I get your name?", "label": 0 },
                    { "text": "Do you mind telling me your name?", "label": 0 },
                    { "text": "May I ask your name?", "label": 0 },
                    { "text": "What is your full name?", "label": 0 },
                    { "text": "How may I address you?", "label": 0 },
                    { "text": "Who are you?", "label": 0 },
                    { "text": "Let me know your name, please.", "label": 0 },
                    { "text": "What do people call you?", "label": 0 },
                    { "text": "What's your name again?", "label": 0 },
                    { "text": "Remind me of your name?", "label": 0 },
                    { "text": "Tell me your name, if you don't mind.", "label": 0 },
                    { "text": "I'd like to know your name.", "label": 0 },
                    { "text": "How do I refer to you?", "label": 0 },
                    { "text": "Introduce yourself, please.", "label": 0 },
                    { "text": "Could you provide your name?", "label": 0 },
                    { "text": "Please tell me your name.", "label": 0 },
                    { "text": "I'd love to know what your name is.", "label": 0 },
                    { "text": "Who might you be?", "label": 0 },
                    { "text": "Give me your name, if possible.", "label": 0 },
                    { "text": "How do people usually address you?", "label": 0 },
                    { "text": "Can I ask for your name?", "label": 0 },
                    { "text": "What's your date of birth?", "label": 1 },
                    { "text": "Can you tell me your birthdate?", "label": 1 },
                    { "text": "May I know your date of birth?", "label": 1 },
                    { "text": "When is your birthday?", "label": 1 },
                    { "text": "Could you share your date of birth?", "label": 1 },
                    { "text": "What day were you born?", "label": 1 },
                    { "text": "Your date of birth, please?", "label": 1 },
                    { "text": "On what date were you born?", "label": 1 },
                    { "text": "When were you born?", "label": 1 },
                    { "text": "Can I have your date of birth?", "label": 1 },
                    { "text": "Could you provide your birthdate?", "label": 1 },
                    { "text": "What's your DOB?", "label": 1 },
                    { "text": "When is your birthdate?", "label": 1 },
                    { "text": "Would you mind sharing your date of birth?", "label": 1 },
                    { "text": "What year, month, and day were you born?", "label": 1 },
                    { "text": "Can I get your date of birth, please?", "label": 1 },
                    { "text": "Tell me your birthdate, if you don't mind.", "label": 1 },
                    { "text": "I'd like to know your date of birth.", "label": 1 },
                    { "text": "What's the date of your birth?", "label": 1 },
                    { "text": "Which day is your birthday?", "label": 1 },
                    { "text": "Could you let me know your date of birth?", "label": 1 },
                    { "text": "Please share your birthdate with me.", "label": 1 },
                    { "text": "What day and year were you born?", "label": 1 },
                    { "text": "How old are you, and when were you born?", "label": 1 },
                    { "text": "Can you confirm your date of birth?", "label": 1 },
                    { "text": "When exactly were you born?", "label": 1 },
                    { "text": "What's your birthday month and day?", "label": 1 },
                    { "text": "Would you share your DOB?", "label": 1 },
                    { "text": "Can I know the date of your birth?", "label": 1 },
                    { "text": "Let me know your date of birth, please.", "label": 1 },
                    { "text": "You're under arrest.", "label": 2 },
                    { "text": "I am arresting you.", "label": 2 },
                    { "text": "You're being placed under arrest.", "label": 2 },
                    { "text": "I'm taking you into custody.", "label": 2 },
                    { "text": "You are officially under arrest.", "label": 2 },
                    { "text": "We're detaining you for now.", "label": 2 },
                    { "text": "I'm placing you under arrest.", "label": 2 },
                    { "text": "You're being arrested right now.", "label": 2 },
                    { "text": "I have to arrest you.", "label": 2 },
                    { "text": "We are taking you into custody.", "label": 2 },
                    { "text": "By law, I'm arresting you.", "label": 2 },
                    { "text": "You're being charged and arrested.", "label": 2 },
                    { "text": "You're going to be taken into custody.", "label": 2 },
                    { "text": "You'll be under arrest now.", "label": 2 },
                    { "text": "I'm detaining you for arrest.", "label": 2 },
                    { "text": "This is an arrest. You need to comply.", "label": 2 },
                    { "text": "You are under arrest and must come with me.", "label": 2 },
                    { "text": "I am charging and arresting you.", "label": 2 },
                    { "text": "You'll need to cooperate as you're under arrest.", "label": 2 },
                    { "text": "This is an official arrest.", "label": 2 },
                    { "text": "You are being taken into custody immediately.", "label": 2 },
                    { "text": "For your actions, I'm arresting you.", "label": 2 },
                    { "text": "We're arresting you right now.", "label": 2 },
                    { "text": "You'll need to come with us. You're under arrest.", "label": 2 },
                    { "text": "You are being detained and arrested.", "label": 2 },
                    { "text": "This is an arrest warrant in action.", "label": 2 },
                    { "text": "I'm officially arresting you.", "label": 2 },
                    { "text": "You are subject to arrest as of now.", "label": 2 },
                    { "text": "You're being taken in under arrest.", "label": 2 },
                    { "text": "By authority, I am arresting you now.", "label": 2 },
                    { "text": "What's the weather like today?", "label": 3 },
                    { "text": "Can you recommend a good book?", "label": 3 },
                    { "text": "What time does the store close?", "label": 3 },
                    { "text": "How do I bake a cake?", "label": 3 },
                    { "text": "What's the capital of France?", "label": 3 },
                    { "text": "Can you help me fix my car?", "label": 3 },
                    { "text": "Who won the game last night?", "label": 3 },
                    { "text": "How do I get to the nearest gas station?", "label": 3 },
                    { "text": "What movies are playing today?", "label": 3 },
                    { "text": "Do you know a good plumber?", "label": 3 },
                    { "text": "What's your favorite color?", "label": 3 },
                    { "text": "Tell me a joke.", "label": 3 },
                    { "text": "Can you teach me how to knit?", "label": 3 },
                    { "text": "What's 2 + 2?", "label": 3 },
                    { "text": "Who is the president of the United States?", "label": 3 },
                    { "text": "What is quantum physics?", "label": 3 },
                    { "text": "Can I borrow your phone?", "label": 3 },
                    { "text": "What is the meaning of life?", "label": 3 },
                    { "text": "How do I install new software on my computer?", "label": 3 },
                    { "text": "What are some good workout routines?", "label": 3 },
                    { "text": "Do you know how to repair a bicycle?", "label": 3 },
                    { "text": "What's the best restaurant in town?", "label": 3 },
                    { "text": "Can you solve this math problem?", "label": 3 },
                    { "text": "How do I change a flat tire?", "label": 3 },
                    { "text": "What is the history of the Roman Empire?", "label": 3 },
                    { "text": "Do you know any good jokes?", "label": 3 },
                    { "text": "What's the tallest mountain in the world?", "label": 3 },
                    { "text": "How do I start a garden?", "label": 3 },
                    { "text": "What is your favorite hobby?", "label": 3 },
                    { "text": "Can you explain the theory of relativity?", "label": 3 }
                ];
                initialIntents.forEach(intent => intentStore.add(intent));
            }
            if (!db.objectStoreNames.contains('labels')) {
                const labelStore = db.createObjectStore('labels', { keyPath: 'id' });
                const initialLabels = [
                    { id: 0, name: "Request for Name" },
                    { id: 1, name: "Request for DOB" },
                    { id: 2, name: "Intent to Arrest" },
                    { id: 3, name: "Out of Scope" }
                ];
                initialLabels.forEach(label => labelStore.add(label));
            }
            if (!db.objectStoreNames.contains('testResults')) {
                const testResultsStore = db.createObjectStore('testResults', { keyPath: 'id', autoIncrement: true });
                testResultsStore.createIndex('clipId', 'clipId', { unique: false });
                testResultsStore.createIndex('label', 'label', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

export function saveAudioClip(db, audioBlob) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('audioClips', 'readwrite');
        const store = transaction.objectStore('audioClips');
        const request = store.add({ blob: audioBlob });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function updateAudioClipName(db, id, name) {
    console.log(id, name.trim().replace(/[^\w\s]/gi, ''));
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('audioClips', 'readwrite');
        const store = transaction.objectStore('audioClips');
        const request = store.get(id);
        request.onsuccess = (event) => {
            const clip = event.target.result;
            clip.name = name.trim().replace(/[^\w\s]/gi, '');
            store.put(clip);
            resolve();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

export function updateAudioClipWithResponse(db, id, response) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('audioClips', 'readwrite');
        const store = transaction.objectStore('audioClips');
        const request = store.get(id);

        request.onsuccess = (event) => {
            const clip = event.target.result;
            clip.response = response;
            store.put(clip);
            resolve();
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

export function saveWebSocketResponse(db, response) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('websocketResponses', 'readwrite');
        const store = transaction.objectStore('websocketResponses');
        const request = store.add({ data: response });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function getAllAudioClips(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('audioClips', 'readonly');
        const store = transaction.objectStore('audioClips');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function getAllWebSocketResponses(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('websocketResponses', 'readonly');
        const store = transaction.objectStore('websocketResponses');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function deleteAudioClip(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('audioClips', 'readwrite');
        const store = transaction.objectStore('audioClips');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function clearWebSocketResponses(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('websocketResponses', 'readwrite');
        const store = transaction.objectStore('websocketResponses');
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function saveStep(db, step) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('steps', 'readwrite');
        const store = transaction.objectStore('steps');
        const request = store.add(step);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function getAllSteps(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('steps', 'readonly');
        const store = transaction.objectStore('steps');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function updateStep(db, id, step) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('steps', 'readwrite');
        const store = transaction.objectStore('steps');
        const request = store.get(id);

        request.onsuccess = (event) => {
            const existingStep = event.target.result;
            const updatedStep = { ...existingStep, ...step };
            store.put(updatedStep);
            resolve();
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

export function getAllIntents(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('intents', 'readonly');
        const store = transaction.objectStore('intents');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function saveIntent(db, intent) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('intents', 'readwrite');
        const store = transaction.objectStore('intents');
        const request = store.add(intent);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function getAllLabels(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('labels', 'readonly');
        const store = transaction.objectStore('labels');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function saveLabel(db, label) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('labels', 'readwrite');
        const store = transaction.objectStore('labels');
        const request = store.add(label);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function deleteLabel(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('labels', 'readwrite');
        const store = transaction.objectStore('labels');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function deleteIntent(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('intents', 'readwrite');
        const store = transaction.objectStore('intents');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function saveTestResult(db, clipId, result) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('testResults', 'readwrite');
        const store = transaction.objectStore('testResults');
        const request = store.add({ clipId, result });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

export function getAllTestResults(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('testResults', 'readonly');
        const store = transaction.objectStore('testResults');
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

export function updateAudioClipExpectedLabels(db, id, expectedLabels) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('audioClips', 'readwrite');
        const store = transaction.objectStore('audioClips');
        const request = store.get(id);

        request.onsuccess = (event) => {
            const clip = event.target.result;
            clip.expectedLabels = expectedLabels;
            store.put(clip);
            resolve();
        };

        request.onerror = (event) => reject(event.target.error);
    });
} 