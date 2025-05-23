from flask import Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()
auth_bp = Blueprint('auth', __name__)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    projects = db.relationship('Project', backref='user', lazy=True)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    data = db.Column(db.Text, nullable=False)
    thumbnail = db.Column(db.Text) # URL da miniatura ou JSON
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email já está registado.'}), 400

    hashed_password = generate_password_hash(password)
    newUser = User(email=email, password=hashed_password)
    db.session.add(newUser)
    db.session.commit()

    return jsonify({'message': 'Utilizador registado com sucesso.','user_id': newUser.id, 'username': newUser.username}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        return jsonify({'message': 'Login efetuado com sucesso.', 'user_id': user.id}), 200
    else:
        return jsonify({'error': 'Credenciais inválidas.'}), 401

@auth_bp.route('/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    user_id = data.get('user_id')
    name = data.get('name')
    project_data = data.get('data')
    thumbnail = data.get('thumbnail')

    if not User.query.get(user_id):
        return jsonify({'error': 'Utilizador não encontrado.'}), 404
    
    newProject = Project(name=name, data=project_data, thumbnail=thumbnail, user_id=user_id)

    db.session.add(newProject)
    db.session.commit()

    return jsonify({'message': 'Projeto criado com sucesso.', 'project_id': newProject.id}), 201

@auth_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado.'}), 404

    return jsonify({
        'id': project.id,
        'name': project.name,
        'data': project.data,
        'thumbnail': project.thumbnail,
        'user_id': project.user_id
    }), 200

@auth_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Projeto não encontrado.'}), 404

    db.session.delete(project)
    db.session.commit()

    return jsonify({'message': 'Projeto eliminado com sucesso.'}), 200