@echo off
echo stopping bot(if has)
docker stop cherry0324
echo removing docker image(if has)
docker rmi cherry0324:latest
docker build -t cherry0324 .
docker run --rm -d --name cherry0324 -p 3000:3000 cherry0324
echo Build Done!
pause