from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import date, timedelta
import os
import datetime

app = Flask(__name__, static_folder='static', static_url_path='/')
app.secret_key = 'secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, supports_credentials=True)
db = SQLAlchemy(app)

# 모델
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False)
    text = db.Column(db.String(100), nullable=False)
    done = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# 헬퍼
def get_week_dates(start_date):
    return [(start_date + timedelta(days=i)) for i in range(7)]

def get_iso_week_and_year(d):
    iso_calendar = d.isocalendar()  # returns (ISO year, ISO week number, weekday)
    return iso_calendar[0], iso_calendar[1]

# SPA 엔트리
@app.route('/')
def spa_index():
    return send_from_directory('static', 'index.html')

# API: 로그인 상태 확인
@app.route('/api/user')
def get_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'user': None})
    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({'user': None})
    return jsonify({'user': {'id': user.id, 'email': user.email}})

# API: 회원가입
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    if not email or not password:
        return jsonify({'error': '입력값 누락'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': '이미 존재하는 이메일'}), 400
    new_user = User(email=email, password=password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True, 'next': 'login'})

# API: 로그인
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email, password=password).first()
    if user:
        session['user_id'] = user.id
        return jsonify({'success': True})
    return jsonify({'error': '이메일 또는 비밀번호 오류'}), 401

# API: 로그아웃
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

# API: 주간 할 일 불러오기
@app.route('/api/todos')
def get_todos():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    start_str = request.args.get('start')
    try:
        start_date = date.fromisoformat(start_str)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid date'}), 400

    iso_year, iso_week = get_iso_week_and_year(start_date)
    week_dates = get_week_dates(start_date)
    todos_by_date = {}
    for d in week_dates:
        key = d.isoformat()
        todos = Todo.query.filter_by(date=key, user_id=user_id).all()
        todos_by_date[key] = [{'text': t.text, 'done': t.done} for t in todos]

    return jsonify({
        "todos": todos_by_date,
        "iso_year": iso_year,
        "iso_week": iso_week
    })

# API: 할 일 추가
@app.route('/api/todos', methods=['POST'])
def add_todo():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    text = data.get('text', '').strip()
    task_date = data.get('date')

    if not text or not task_date:
        return jsonify({'error': '입력 누락'}), 400

    new_task = Todo(date=task_date, text=text, done=False, user_id=user_id)
    db.session.add(new_task)
    db.session.commit()
    return jsonify({'success': True})

# API: 할 일 완료 상태 토글
@app.route('/api/todos/toggle', methods=['PATCH'])
def toggle_todo():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    task_date = data.get('date')
    index = int(data.get('index', -1))

    todos = Todo.query.filter_by(date=task_date, user_id=user_id).all()
    if 0 <= index < len(todos):
        todos[index].done = not todos[index].done
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid index'}), 400

# API: 할 일 수정
@app.route('/api/todos/edit', methods=['PATCH'])
def edit_todo():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    task_date = data.get('date')
    index = int(data.get('index', -1))
    new_text = data.get('newText', '').strip()

    todos = Todo.query.filter_by(date=task_date, user_id=user_id).all()
    if 0 <= index < len(todos):
        if new_text:
            todos[index].text = new_text
        else:
            db.session.delete(todos[index])
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid index'}), 400

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)