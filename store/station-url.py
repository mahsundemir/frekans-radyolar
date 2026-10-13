#!/usr/bin/env python3
"""stations.json'dan bir radyo için frekans://radyo/<id>?u=<yayın>&n=<ad> bağlantısı üretir."""
import json, sys, urllib.parse, pathlib

sid = sys.argv[1]
d = json.load(open(pathlib.Path(__file__).resolve().parent.parent / "stations.json"))
for l in d["languages"]:
    for c in l["categories"]:
        for s in c["stations"]:
            if s["id"] == sid:
                q = urllib.parse.urlencode({"u": s["streamUrl"], "n": s["name"]})
                print(f"frekans://radyo/{sid}?{q}")
                sys.exit(0)
sys.exit(f"radyo yok: {sid}")
