import requests
import sys

# url = "https://api.squarespace.com/1.0/commerce/products/"+sys.argv[1]+"/images"

# files=[
#   ('file',('mying.png',open(sys.argv[2],'rb'),'image/jpeg'))
# ]
# headers = {
#   'Authorization': 'Bearer '+sys.argv[3],
#   'User-Agent': 'Amarii'
# }

# response = requests.request("POST", url, headers=headers, files=files)
# print(response)
url = "https://api.squarespace.com/1.0/commerce/products/"+sys.argv[1]+"/images"

files=[
  ('file',('mying.png',open(sys.argv[2],'rb'),'image/png'))
]
headers = {
  'Authorization': 'Bearer '+sys.argv[3],
  'User-Agent': 'Amarii'
}

response = requests.request("POST", url, headers=headers, files=files)
