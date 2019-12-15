import atexit
import json
import os
import pickle

from typing import Iterable

from .util import bdecode

class RedisList:
    def __init__(self, namespace, redis_handle):
        self.namespace = namespace
        self.redis = redis_handle
    def __iter__(self):
        for k in self.redis.hkeys():
            yield bdecode(k)


class DB:
    def __init__(self, write_to, redis_handle=None, pickle_file=None, namespace="db", is_meta=False, value=None):
        if write_to == "file":
            if pickle_file is None:
                pickle_file = f"{namespace}.p"
            if os.path.exists(pickle_file):
                self._db = pickle.load(open(pickle_file, "rb"))
            else:
                self._db = value or {'topics': set(), 'sessions': {}}
            self.register_file_save_atexit()
        elif write_to == "redis":
            self._db = redis_handle
            if value:
                for k, v in value.items():
                    self[k] = v
        else:
            raise ValueError(f"Invalid write_to value: {write_to}")

        self.pickle_file = pickle_file
        self.redis = redis_handle
        self.namespace = namespace
        self.write_to = write_to

        if not is_meta:
            self.meta = DB(write_to=write_to, redis_handle=redis_handle, namespace=f"{namespace}:meta", is_meta=True)
        self.is_meta = is_meta

    def register_file_save_atexit(self):
        @atexit.register
        def save_db():
            pickle.dump(self._db, open(self.pickle_file, "wb"))

    def namespace_key(self, *keys):
        return f"{self.namespace}:{':'.join(keys)}"

    def field_meta(self, k):
        if self.is_meta:
            v = self._get(k)
            if not v or not len(v):
                return {}
            return json.loads(v)

        namespace_k = self.namespace_key(k)
        v = self.meta.get(namespace_k)
        if not v or not len(v):
            self.meta[namespace_k] = {}
            v = self.meta[namespace_k]
        return json.loads(v)

    def field_meta_set(self, k, v):
        if self.is_meta:
            self._set(k, json.dumps(v))
            return
        self.meta[k] = v

    @property
    def ignorable_types(self):
        return (int, type(None))

    def redis_value_parse_output(self, k, v):
        #print('output', k, v)
        #print('field_meta', self.field_meta(k))
        if self.field_meta(k).get('type') == 'bool':
            v = bool(int(v))
        elif self.field_meta(k).get('type') == 'dict':
            #print('is_dict', v)
            v = json.loads(v)
        elif isinstance(v, str):
            if v.isdigit():
                v = int(v)
        elif isinstance(v, self.ignorable_types):
            pass
        elif isinstance(v, dict):
            v = DB(
                write_to=self.write_to,
                namespace=self.namespace_key(k),
                redis_handle=self.redis,
                value=v,
            )
        elif isinstance(v, Iterable):
            v = RedisList(
                namespace=self.namespace_key(k),
                redis_handle=self.redis,
            )
        else:
            raise ValueError(f"Unparsable type: {type(v)}")
        return v

    def set_meta_field_type(self, k, type_):
        return self.field_meta_set(k, {**self.field_meta(k), 'type': type_})

    def redis_value_parse_input(self, k, v):
        #print('input', self.namespace, k, v, type(v))

        if isinstance(v, bool):
            v = int(v) # use TinyInt
            self.set_meta_field_type(k, 'bool')
        elif isinstance(v, self.ignorable_types):
            pass
        elif isinstance(v, dict):
            v = json.dumps(v)
            self.set_meta_field_type(k, 'dict')
        else:
            raise ValueError(f"Unparsable type: {type(v)}")
        return v

    def _get(self, k):
        return bdecode(self.redis.hget(self.namespace, k))

    def __getitem__(self, k):
        if self.write_to == 'file':
            return self._db[k]
        return self.redis_value_parse_output(k, self._get(k))

    def get(self, k):
        if self.write_to == 'file':
            return self._db.get(k)
        try:
            v = self.__getitem__(k)
        except KeyError:
            v = None
        return v

    def _set(self, k, v):
        return self.redis.hset(self.namespace, k, v)

    def __setitem__(self, k, v):
        if self.write_to == 'file':
            self._db[k] = v
            return k
        return self._set(k, self.redis_value_parse_input(k, v))

    def __delitem__(self, k):
        if self.write_to == 'file':
            del self._db[k]
            return
        return self.redis.hdel(self.namespace, k)

    def __missing__(self, k):
        raise KeyError(k)

    def __iter__(self, k):
        if self.write_to == 'file':
            for k in self._db.keys():
                yield k
            return
        for k in self.redis.hkeys(self.namespace):
            yield k

    def __contains__(self, k):
        if self.write_to == 'file':
            return k in self._db
        return self.redis.hexists(self.namespace, k)
