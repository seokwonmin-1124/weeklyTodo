import os
from app import db, app

DB_PATH = 'instance/todo.db'  # 또는 'instance/todo.db' 경로에 따라 조정

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print('🧹 기존 DB 삭제 완료')

with app.app_context():
    db.create_all()
    print('✅ 새 DB 생성 완료')