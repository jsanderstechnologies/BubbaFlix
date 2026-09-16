import urllib.request
import time

url = 'http://localhost:5150/api/transcode/subtitle?url=https%3A%2F%2F1-cdn2-ovh-bea.energycdn.com%2Fcdn3sto%2Ffluffyrainbowclouds-sto%2F6a9a3c7dde4ee3.61911222%2F387149411%2F1789355960%2Fec55b35514847685d326c1550e2890d517f6ae23%2Fd3f54ef74ccb32c5e0a8ee6cdd510a7210d3663177744a05ff9c2a891bd397bc%2FMayday.2026.1080p.10bit.WEBRip.6CH.x265.HEVC-PSA.mkv&index=3&ss=0'

print('Fetching...')
try:
    req = urllib.request.urlopen(url)
    start_time = time.time()
    for _ in range(10):
        line = req.readline()
        print(f"{time.time() - start_time:.2f}s: {line}")
except Exception as e:
    print('Error:', e)
