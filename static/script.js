let currentMonday = getMonday(new Date());
let isMonthTitle = false;

document.addEventListener('DOMContentLoaded', function () {
    checkLogin();

    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    document.getElementById('toggleAuth').addEventListener('click', toggleAuthMode);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('prevWeek').addEventListener('click', function (e) {
        e.preventDefault();
        currentMonday.setDate(currentMonday.getDate() - 7);
        loadWeek(currentMonday);
    });

    document.getElementById('nextWeek').addEventListener('click', function (e) {
        e.preventDefault();
        currentMonday.setDate(currentMonday.getDate() + 7);
        loadWeek(currentMonday);
    });

    document.getElementById('weekTitle').addEventListener('click', function () {
        isMonthTitle = !isMonthTitle;
        loadWeek(currentMonday);
    });
});

function getMonday(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0); // Ensure consistent time
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

async function checkLogin() {
    const res = await fetch('/api/user', { credentials: 'include' });
    const data = await res.json();
    if (data.user) {
        document.getElementById('authBox').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        loadWeek(currentMonday);
    } else {
        document.getElementById('authBox').style.display = 'block';
        document.querySelector('.container').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
    document.body.style.visibility = 'visible';
}

function toggleAuthMode() {
    const title = document.getElementById('authTitle');
    const toggleBtn = document.getElementById('toggleAuth');
    const isLogin = title.textContent === '로그인';
    title.textContent = isLogin ? '회원가입' : '로그인';
    toggleBtn.textContent = isLogin ? '로그인하기' : '회원가입하기';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const isLogin = document.getElementById('authTitle').textContent === '로그인';
    const url = isLogin ? '/api/login' : '/api/signup';

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
        if (!isLogin) {
            toggleAuthMode(); // Switch to login mode after signup
            alert("회원가입이 완료되었습니다. 로그인해주세요.");
        } else {
            checkLogin();
        }
    } else {
        alert(data.error || '처리 실패');
    }
}

async function logout() {
    await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    });
    checkLogin();
}

async function loadWeek(monday) {
    const mondayFixed = new Date(monday);
    mondayFixed.setDate(mondayFixed.getDate() + 1); // move Monday to Tuesday
    const startDate = formatDate(mondayFixed);
    const res = await fetch(`/api/todos?start=${startDate}`, { credentials: 'include' });
    const data = await res.json();

    console.log("서버 응답 데이터:", data);

    const container = document.getElementById('weekContainer');
    container.innerHTML = '';

    const weekTitle = document.getElementById('weekTitle');

    const days = [];
    const startDay = new Date(monday);
    startDay.setDate(startDay.getDate() + 1);
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDay);
        d.setDate(startDay.getDate() + i);
        days.push(d);
    }

    const daysInMonth = {};
    for (const d of days) {
        const m = d.getMonth() + 1;
        daysInMonth[m] = (daysInMonth[m] || 0) + 1;
    }
    const maxMonth = Object.entries(daysInMonth).reduce((a, b) => a[1] >= b[1] ? a : b)[0];
    const displayMonth = parseInt(maxMonth);
    const displayYear = days.find(d => d.getMonth() + 1 === displayMonth).getFullYear();

    const isoYear = data.iso_year;
    const isoWeek = data.iso_week;

    const todosRaw = data.todos || {};
    const todos = {};
    for (const k in todosRaw) {
        todos[k.trim()] = todosRaw[k];
    }

    console.log("ISO 기준 연도/주차:", isoYear, isoWeek);
    const displayMonthStr = String(displayMonth).padStart(2, '0');
    
    const iso = new Date(monday);
    const temp = new Date(iso.getTime());
    temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
    const firstThursday = new Date(temp.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((temp.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
    const isoYearFixed = temp.getFullYear();

    weekTitle.textContent = isMonthTitle
        ? `${displayYear}년 ${displayMonthStr}월`
        : `${isoYearFixed}년 ${weekNumber}주차`;

    for (const day of days) {
        const key = formatDate(day);
        console.log("렌더링 날짜 key:", key, "데이터 존재 여부:", Object.prototype.hasOwnProperty.call(todos, key), "데이터 내용:", todos[key]);
        const div = document.createElement('div');
        div.className = 'day';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'date';
        if (day.getDay() === 6) dateDiv.classList.add('sat');
        if (day.getDay() === 0) dateDiv.classList.add('sun');
        if (formatDate(day) === formatDate(new Date())) {
            dateDiv.classList.add('today');
        }

        dateDiv.textContent = String(day.getDate()).padStart(2, '0');
        dateDiv.addEventListener('click', () => showAddInput(dateDiv, key));
        div.appendChild(dateDiv);

        const todosDiv = document.createElement('div');
        todosDiv.className = 'todos';

        const dayData = todos[key] || [];
        if (Array.isArray(dayData)) {
            for (let i = 0; i < dayData.length; i++) {
                const task = dayData[i];
                const todo = document.createElement('div');
                todo.className = 'todo';
                if (task.done) todo.classList.add('done');
                todo.dataset.date = key;
                todo.dataset.index = i;
                todo.textContent = task.text.slice(0, 10);
                attachTodoEvents(todo, key, i);
                todosDiv.appendChild(todo);
            }
        }

        div.appendChild(todosDiv);
        container.appendChild(div);
    }
}

function showAddInput(dateDiv, date) {
    const todosDiv = dateDiv.parentElement.querySelector('.todos');
    if (todosDiv.querySelector('.add-input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '할 일 추가';
    input.maxLength = 10;
    input.className = 'todo add-input';
    input.style.textAlign = 'center';

    let isComposing = false;

    input.addEventListener('compositionstart', () => { isComposing = true; });
    input.addEventListener('compositionend', () => { isComposing = false; });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !isComposing) {
            e.preventDefault();
            const task = input.value.trim();
            if (task) {
                fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ text: task, date })
                }).then(() => loadWeek(currentMonday));
            }
        } else if (e.key === 'Escape') {
            input.remove();
        }
    });

    todosDiv.appendChild(input);
    input.focus();
}

function attachTodoEvents(el, date, index) {
    let pressTimer;

    el.addEventListener('click', function () {
        if (!el.classList.contains('editing')) {
            fetch('/api/todos/toggle', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ date, index })
            }).then(() => loadWeek(currentMonday));
        }
    });

    el.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => {
            el.classList.add('editing');
            editTodo(el, date, index);
        }, 500);
    });

    el.addEventListener('mouseup', () => clearTimeout(pressTimer));
    el.addEventListener('mouseleave', () => clearTimeout(pressTimer));

    el.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
            el.classList.add('editing');
            editTodo(el, date, index);
        }, 500);
    });

    el.addEventListener('touchend', () => clearTimeout(pressTimer));
}

function editTodo(div, date, index) {
    if (div.classList.contains('edit-input')) return;

    const originalText = div.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.maxLength = 10;
    input.className = 'todo edit-input';
    input.style.width = `${div.offsetWidth}px`;
    input.style.height = `${div.offsetHeight}px`;
    input.style.padding = '0';
    input.style.textAlign = 'center';

    input.addEventListener('blur', () => {
        const newText = input.value.trim();
        if (newText === '') {
            fetch('/api/todos/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ date, index, newText })
            }).then(() => loadWeek(currentMonday));
        } else {
            input.replaceWith(div);
        }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const newText = input.value.trim();
            fetch('/api/todos/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ date, index, newText })
            }).then(() => loadWeek(currentMonday));
        } else if (e.key === 'Escape') {
            input.replaceWith(div);
        }
    });

    div.replaceWith(input);
    input.focus();
}
