```
python -m venv env
source env/bin/activate
pip install -r requirements.txt
source setenv.sh
python put_item.py
python put_fictions.py
python put_products.py
```

```
source env/bin/activate
pip install -r ../lambda/xxxx/requirements.txt
pip install python-lambda-local
touch event.json
echo "{}" > event.json
touch setenv.sh
echo "export TABLENAME=util-table" > setenv.sh
source setenv.sh
python-lambda-local -f lambda_handler lambda/xxxx.py event.json
```