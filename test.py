import urllib.request
import urllib.error
import time

start = time.time()
try:
    print(urllib.request.urlopen('http://localhost:3000/landmarks?lat=48.8584&lng=2.2945').read().decode())
except urllib.error.HTTPError as e:
    print(f'Error: {e.code} {e.reason}')
finally:
    print(f'Time: {time.time() - start:.4f}s')
