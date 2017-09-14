import json
import requests
import subprocess
import sys
import os
from zipfile import ZipFile

def publish(package, app_id, client_id, client_secret, refresh_token, visibility):
    # def check_response_success(response):
    #     if response.status_code != 200:
    #         print('Status {} {}'.format(response.status_code, response.reason))
    #         print(response.text)
    #         sys.exit(1)
    #
    # response = requests.post('https://www.googleapis.com/oauth2/v3/token', data={
    #     'client_id': client_id,
    #     'client_secret': client_secret,
    #     'grant_type': 'refresh_token',
    #     'refresh_token': refresh_token,
    # })
    # check_response_success(response)
    # access_token = response.json()['access_token']
    #
    # session = requests.Session()
    # session.headers['Authorization'] = 'Bearer {}'.format(access_token)
    #
    # print('Getting details for {}'.format(app_id))
    # # currently, only DRAFT is supported
    # url = 'https://www.googleapis.com/chromewebstore/v1.1/items/{}?projection=DRAFT'.format(app_id)
    # response = session.get(url)
    # check_response_success(response)
    # data = response.json()
    # if data.get('itemError'):
    #     for error in data['itemError']:
    #         cprint('{}: {}'.format(error['error_code'], error['error_detail']), 'red')
    #     sys.exit(1)
    # current_version = data['crxVersion']
    current_version = "1.0.5"
    print('Current Webstore version is {}'.format(current_version))
    with ZipFile(package, 'r') as f:
        manifest_name = next(name for name in f.namelist() if name.endswith('manifest.json'))
        print(f.open(manifest_name, 'r').read().decode('utf-8'))
        manifest = json.loads(f.open(manifest_name, 'r').read().decode('utf-8'))
        print('Found {} with version {}'.format(manifest_name, manifest['version']))
    version_parts = current_version.split('.')
    major_version = version_parts[0]
    minor_version = version_parts[1] if len(version_parts) > 1 else '0'
    new_version = '.'.join((major_version, str(int(minor_version) + 1)))
    print('Setting {} to version {}'.format(manifest_name, new_version))
    manifest['version'] = new_version
    subprocess.check_call(['zip', '-d', package, manifest_name], stdout=subprocess.PIPE)
    with ZipFile(package, 'a') as f:
        f.writestr(manifest_name, json.dumps(manifest, indent=4))

    print('Uploading {}'.format(package))
    url = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/{}'.format(app_id)
    with open(package, 'r') as f:
        def print_progress():
            progress = 0
            for line in f:
                progress += len(line)
                print('{:.2f} MB'.format(progress / 1024. / 1024.), end='\r')
                sys.stdout.flush()
                yield line
        response = session.put(url, data=print_progress())
        print()
    check_response_success(response)
    data = response.json()
    if data.get('itemError'):
        for error in data['itemError']:
            print("{}: {}".format(error['error_code'], error['error_detail']))
        sys.exit(1)
    print(data['uploadState'])

    print('Publishing {}'.format(app_id))
    url = 'https://www.googleapis.com/chromewebstore/v1.1/items/{}/publish?publishTarget={}'.format(app_id, visibility)
    response = session.post(url, data='')
    check_response_success(response)
    data = response.json()
    print(data['status'][0])

if __name__ == '__main__':
    publish('./src/lufa-extension.zip',os.environ.get('APP_ID'), os.environ.get('CLIENT_ID'), os.environ.get('CLIENT_SECRET'),os.environ.get('REFRESH_TOKEN'), 'default'  )
