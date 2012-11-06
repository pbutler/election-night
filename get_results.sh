#!/bin/bash

curl -s -S "http://data.cnn.com/ELECTION/2012/full/P.full.json" > results.json
LAST=`md5sum results.json | awk '{print $1}'`
while [ -t ]; do
	curl -s -S "http://data.cnn.com/ELECTION/2012/full/P.full.json" > results.json
	NOW=`md5sum results.json | awk '{print $1}'`
	if [ $NOW != $LAST ]; then
		T=`date`
		git commit -a -m"Election data update at ${T}"
		git push
		echo "done"
	fi
	LAST=$NOW
	sleep 60
done;
