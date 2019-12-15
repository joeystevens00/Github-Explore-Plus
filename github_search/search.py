import atexit
import asyncio
from datetime import datetime
import os
import random
import requests
import pickle
import uuid

from fastapi import FastAPI, HTTPException
import redis

from .util import bdecode
from .data_utils import DB

topics = ('python', 'flask')
CONFIG = {
    'db': 'file',
    'session_inactivity_ttl': 60*60*24*7,
}

app = FastAPI()
r = redis.Redis(os.environ.get('REDIS_HOST'))
db = DB(write_to='file')
ENDPOINT = "https://api.github.com/"
HTML_URLS = True

ACK = {'OK': True}

def not_found(object_name, o=None):
    if o:
        object_name += f"({o})"
    raise HTTPException(status_code=404, detail=f"{object_name.upper()} not found")

def repo(*topics):
    return requests.get(
        f'{ENDPOINT}search/repositories?q=' +
            '+'.join([f'topic:{topic}' for topic in topics])
        ).json()

def get_or_not_found(o, k, empty_is_valid=True):
    v=o.get(k)
    if isinstance(v, type(None)):
        not_found(k)
    if not empty_is_valid and not len(v):
        not_found(k)
    return v

def get_db(k):
    return get_or_not_found(db, k)

def get_session(k):
    return db['sessions'].get(k) or not_found('session', k)

@app.get("/")
async def read_root():
    return {"Hello": "World"}

@app.get("/topics")
def get_topics():
    return get_db('topics')

@app.get("/topic/new/{topic}")
def new_topic(topic: str):
    db['topics'].add(topic)
    return ACK

@app.get("/raw/{topic}")
def read_raw_topic(topic: str):
    return db.get(topic) or not_found('topic', topic)

def random_topic_link(topic):
    return random.choice(get_db(topic)['items'])['html_url']

@app.get("/random")
def read_random():
    topic = random.choice(list(get_db('topics')))
    return {"url": random_topic_link(topic)}

@app.get("/random/{topic}")
def read_random_topic(topic: str):
    return {"url": random_topic_link(topic)}

@app.get("/session/new")
def start_session():
    uid = str(uuid.uuid1())
    db['sessions'][uid] = {'topics': set(), 'last_accessed': datetime.utcnow()}
    return {'id': uid}

def session_topics(session_id, empty_is_valid=True):
    session = get_or_not_found(get_db('sessions'), session_id)
    session['last_accessed'] = datetime.utcnow()
    return get_or_not_found(session, 'topics', empty_is_valid=empty_is_valid)

@app.get("/session/{session_id}")
def get_session_topics(session_id: str):
    return {'topics': session_topics(session_id)}

@app.get("/session/{session_id}/topics")
def get_session_topics(session_id: str):
    return session_topics(session_id)

@app.get("/session/{session_id}/topic/new/{topic}")
def new_session_topic(session_id: str, topic: str):
    session_topics(session_id).add(topic)
    if not topic in get_db('topics'):
        db['topics'].add(topic)
    return ACK

@app.get("/session/{session_id}/topic/delete/{topic}")
def new_session_topic(session_id: str, topic: str):
    if topic not in session_topics(session_id):
        return not_found(topic)
    session_topics(session_id).remove(topic)
    return ACK

@app.get("/session/{session_id}/random/{topic}")
def read_random_session_topic(session_id: str, topic: str):
    if topic not in session_topics(session_id):
        not_found(f'{session_id}/topic', topic)
    return {'url': random_topic_link(topic)}

@app.get("/session/{session_id}/random")
def read_random_session(session_id: str):
    return {'url': random_topic_link(random.choice(list(session_topics(session_id, empty_is_valid=False))))}

async def populate_repos_relating_to_topics():
    if not len(topics or db.get('topics')):
        raise ValueError("Search needs topics to populate.")
    if not db.get('topics'):
        db['topics'] = set(topics)

    if not db.get('sessions'):
        db['sessions'] = {}

    for session, o in db['sessions'].copy().items():
        print('session', session, 'o', o)
        if not o.get('last_accessed') or (datetime.utcnow() - o.get('last_accessed')).seconds > CONFIG['session_inactivity_ttl']:
            print(f"EXPIRING SESSION {session}")
            del db['sessions'][session]

    for topic in db['topics'].copy():
        await asyncio.sleep(0.1)
        if not db.get(topic):
            print(f"Fetching Github Repo for {topic}")
            db[topic] = repo(topic)
    await asyncio.sleep(1)
    asyncio.get_event_loop().create_task(populate_repos_relating_to_topics())

asyncio.get_event_loop().create_task(populate_repos_relating_to_topics())
