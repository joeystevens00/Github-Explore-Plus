from github_search.data_utils import DB, RedisList
import fakeredis


def simple_test(d):
    d['a'] = 1
    assert d['a'] == 1
    d['a'] = True
    assert d['a']
    d['a'] = {'a' : True}
    assert d['a']['a']
    d['a'] = [1, 2, 3]
    assert d['a'] == [1, 2, 3]

r = fakeredis.FakeStrictRedis()
#d = DB(write_to='redis', redis_handle=r)
#simple_test(d)
simple_test(DB(write_to='file'))
