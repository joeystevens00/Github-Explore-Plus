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
from starlette.requests import Request
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates

from .util import bdecode
from .data_utils import DB

topics = ('python', 'flask')
CONFIG = {
    'db': 'file',
    'session_inactivity_ttl': 60*60*24*7,
}

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")
r = redis.Redis(os.environ.get('REDIS_HOST'))
db = DB(write_to='file')
ENDPOINT = "https://api.github.com/"
HTML_URLS = True

ACK = {'OK': True}

@app.get('/gm.js')
async def get_userscript(request: Request):
    return templates.TemplateResponse(
        "gm.js",
        {
            "request": request,
            "endpoint": f'{request.url.scheme}://{request.url.hostname}:{request.url.port}'
        },
        media_type='application/javascript'
    )

def not_found(object_name, o=None):
    if o:
        object_name += f"({o})"
    raise HTTPException(status_code=404, detail=f"{object_name.upper()} not found")

def repo(*topics, raw_query=False):
    query_type = '' if raw_query else 'topic:'
    return requests.get(
        f'{ENDPOINT}search/repositories?q=' +
            '+'.join([f'{query_type}{topic}' for topic in topics])
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

def random_topic_link(topic, exclude=None):
    items = get_db(topic)['items']
    if exclude:
        def exclude_filter(i):
            if i['html_url'] in exclude:
                return False
            return True
        items = [i for i in filter(exclude_filter, items)]
    return random.choice(items)['html_url']

def random_topic_link_session(session_id, topic):
    exclude = None
    s = session(session_id)
    if s.get('no_repeats'):
        exclude = s.get('links_consumed', set())
    link = random_topic_link(topic, exclude=exclude)
    if not s.get('links_consumed'):
        s['links_consumed'] = set()
    s['links_consumed'].add(link)
    return link

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

def session(session_id):
    return get_or_not_found(get_db('sessions'), session_id)

def session_field(session_id, field, empty_is_valid=True):
    s = session(session_id)
    s['last_accessed'] = datetime.utcnow()
    return get_or_not_found(s, field, empty_is_valid=empty_is_valid)

def session_topics(session_id, **kwargs):
    return session_field(session_id, 'topics', **kwargs)

def update_session(session_id, values):
    settings = ['no_repeats']
    s = session(session_id)
    valid_request = False
    updated = {}
    for k, v in values.items():
        if k in settings:
            s[k] = v
            updated[k] = v
    if not len(updated):
        raise HTTPException(status_code=400, detail=f"Settings must be one of: {','.join(settings)}")
    return session(session_id)

@app.get("/session/{session_id}")
def get_session_route(session_id: str):
    return session(session_id)

@app.put("/session/{session_id}")
async def update_session_route(request: Request, session_id: str):
    return update_session(session_id, await request.json())

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
    return {'url': random_topic_link_session(session_id, topic)}

@app.get("/session/{session_id}/random")
def read_random_session(session_id: str):
    return {'url': random_topic_link_session(session_id, random.choice(list(session_topics(session_id, empty_is_valid=False))))}

async def populate_repos_relating_to_topics():
    if not len(topics or db.get('topics')):
        raise ValueError("Search needs topics to populate.")
    if not db.get('topics'):
        db['topics'] = set(topics)

    if not db.get('sessions'):
        db['sessions'] = {}

    for session, o in db['sessions'].copy().items():
        #print('session', session, 'o', o)
        if not o.get('last_accessed') or (datetime.utcnow() - o.get('last_accessed')).seconds > CONFIG['session_inactivity_ttl']:
            print(f"EXPIRING SESSION {session}")
            del db['sessions'][session]

    for topic in db['topics'].copy():
        await asyncio.sleep(0.1)
        if not db.get(topic):
            print(f"Fetching Github Repo for {topic}")
            repo_args = {'topic':topic}
            if ':' in topic and topic.split(':')[0] == 'raw':
                repo_args['raw_query'] = True
                repo_args['topic'] = ':'.join(topic.split(':')[1:])
                print(repr({**repo_args}))
            db[topic] = repo(repo_args.pop('topic'), **repo_args)
    await asyncio.sleep(1)
    asyncio.get_event_loop().create_task(populate_repos_relating_to_topics())

asyncio.get_event_loop().create_task(populate_repos_relating_to_topics())
