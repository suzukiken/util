import shopify
from datetime import datetime, timedelta
import json
from string import Template
import os
from pprint import pprint

SHOPIFY_VERSION = '2020-10'
SHOPIFY_PASSWORD = os.environ.get('SHOPIFY_PASSWORD')
SHOPIFY_SHOP = os.environ.get('SHOPIFY_SHOP')
SHOPIFY_GRAPHQL_URL = '{}.myshopify.com'.format(SHOPIFY_SHOP)

session = shopify.Session(SHOPIFY_GRAPHQL_URL, SHOPIFY_VERSION, SHOPIFY_PASSWORD)
shopify.ShopifyResource.activate_session(session)

for i in range(0, 5):
    
    SKU = '9999'
    PCS = '10'
    
    # 商品を登録する
    
    tempstr_create = """
      mutation {
        productCreate(input: {
          title: "テスト商品"
          variants: {
            sku: "$sku"
            inventoryManagement: SHOPIFY
          }
        }) {
          product {
            id
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                    inventoryLevels(first: 1) {
                      edges {
                        node {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    """
    
    gqlstr = Template(tempstr_create).substitute(sku=SKU)
    res = shopify.GraphQL().execute(gqlstr)
    
    resdir = json.loads(res)
    graphqlid_product = resdir['data']['productCreate']['product']['id']
    graphqlid_variant = resdir['data']['productCreate']['product']['variants']['edges'][0]['node']['id']
    graphqlid_item = resdir['data']['productCreate']['product']['variants']['edges'][0]['node']['inventoryItem']['id']
    graphqlid_level = resdir['data']['productCreate']['product']['variants']['edges'][0]['node']['inventoryItem']['inventoryLevels']['edges'][0]['node']['id']
    
    pprint(resdir)
    
    # SKUで商品を見つける
    
    template_inventory_item = """
    {
      inventoryItems(first: 1, query: "sku:$sku") {
        edges {
          node {
            inventoryLevels(first:1) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
    """
    
    inventory_item_query = Template(template_inventory_item).substitute(
      sku=SKU
    )
    
    inventory_item_query_response = shopify.GraphQL().execute(inventory_item_query)
    
    res = json.loads(inventory_item_query_response)
    
    graphqlid_level = res['data']['inventoryItems']['edges'][0]['node']['inventoryLevels']['edges'][0]['node']['id']
    
    pprint(res)
    
    # 在庫数を変更する
    
    template_inventory_adjust = """
      mutation {
        inventoryAdjustQuantity(input: {
          inventoryLevelId: "$graphqlid_level",
          availableDelta: $pcs
        }) {
          inventoryLevel {
            id
            item {
              sku
              variant {
                displayName
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    """
    
    inventory_adjust_query = Template(template_inventory_adjust).substitute(
      graphqlid_level=graphqlid_level,
      pcs=PCS
    )
    
    inventory_adjust_response = shopify.GraphQL().execute(inventory_adjust_query)
    
    res = json.loads(inventory_adjust_response)
    
    pprint(res)
    
    # shopifyの在庫数を確認する
    
    template_available = """
    {
      inventoryItems(first: 1, query: "id=$graphqlid_item") {
        edges {
          node {
            inventoryLevels(first:1) {
              edges {
                node {
                  available
                }
              }
            }
          }
        }
      }
    }
    """
    
    available_query = Template(template_available).substitute(graphqlid_item=graphqlid_item)
    
    available_response = shopify.GraphQL().execute(available_query)
    
    pprint(available_response)
    
    resdir = json.loads(available_response)
    
    pprint(resdir)
    
    available = resdir['data']['inventoryItems']['edges'][0]['node']['inventoryLevels']['edges'][0]['node']['available']
    
    # 商品を削除する
    
    template_delete = """
      mutation {
        productDelete(input: {
          id: "$graphqlid_product"
        }) {
          shop {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    """
        
    template_query = Template(template_delete).substitute(graphqlid_product=graphqlid_product)
    
    res = shopify.GraphQL().execute(template_query)
    
    resdir = json.loads(res)
    
    pprint(resdir)