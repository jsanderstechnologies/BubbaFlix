# Dispatcharr API Documentation

**API Version:** `1.0.0`  
**Base URL:** `http://192.168.10.3:9191`  
**Swagger UI URL:** `http://192.168.10.3:9191/api/swagger/#/`  
**Raw Schema Endpoint:** `http://192.168.10.3:9191/api/schema/?format=json`  

> API documentation for Dispatcharr

---
## Table of Contents
1. [Authentication](#authentication)
2. [API Endpoints by Category](#api-endpoints-by-category)
   - [Accounts & Authentication](#accounts--authentication) (22 endpoints)
   - [Channels, DVR & Recordings](#channels-dvr--recordings) (93 endpoints)
   - [EPG (Electronic Program Guide)](#epg-electronic-program-guide) (24 endpoints)
   - [M3U Management](#m3u-management) (31 endpoints)
   - [VOD (Video on Demand)](#vod-video-on-demand) (24 endpoints)
   - [Streaming & Proxy Engine](#streaming--proxy-engine) (19 endpoints)
   - [HDHomeRun Emulation](#hdhomerun-emulation) (29 endpoints)
   - [Backups](#backups) (10 endpoints)
   - [Integrations & Subscriptions](#integrations--subscriptions) (17 endpoints)
   - [Plugins & Repositories](#plugins--repositories) (19 endpoints)
   - [Core System & Settings](#core-system--settings) (39 endpoints)
3. [Data Models / Schemas](#data-models--schemas)

---
## Authentication
Dispatcharr API supports multiple authentication schemes:

### `ApiKeyAuth`
- **Type:** `apiKey`
- **Header Name:** `X-API-Key` (`in: header`)
- **Details:** API key authentication.

Pass your personal API key in the `X-API-Key` request header. Keys can be generated via `POST /api/accounts/api-keys/generate/` and revoked via `POST /api/accounts/api-keys/revoke/`.

### `jwtAuth`
- **Type:** `http`
- **Scheme:** `bearer` (JWT)
- **Details:** JWT Bearer authentication.

Obtain a token pair via `POST /api/accounts/token/` using your username and password, then paste the **access token** here — Swagger adds the `Bearer ` prefix automatically.

Access tokens expire after 30 minutes. Refresh using `POST /api/accounts/token/refresh/`.

---
## API Endpoints by Category

### Accounts & Authentication
Total Endpoints: **22**

#### `GET` `/api/accounts/api-keys/`
**Operation ID:** `api_accounts_api_keys_retrieve`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/accounts/api-keys/generate/`
**Operation ID:** `api_accounts_api_keys_generate_create`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/accounts/api-keys/revoke/`
**Operation ID:** `api_accounts_api_keys_revoke_create`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/accounts/auth/login/`
**Operation ID:** `api_accounts_auth_login_create`  

Alias for POST /api/accounts/token/ — returns JWT access and refresh tokens.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`LoginRequest`](#model-loginrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`LoginRequest`](#model-loginrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`LoginRequest`](#model-loginrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/accounts/auth/logout/`
**Operation ID:** `api_accounts_auth_logout_create`  

Log out the current user

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/accounts/groups/`
**Operation ID:** `api_accounts_groups_list`  

Retrieve a list of groups

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [Group](#model-group) |

---
#### `POST` `/api/accounts/groups/`
**Operation ID:** `api_accounts_groups_create`  

Create a new group

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Group`](#model-group)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Group`](#model-group)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Group`](#model-group)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Group](#model-group) |

---
#### `GET` `/api/accounts/groups/{id}/`
**Operation ID:** `api_accounts_groups_retrieve`  

Retrieve a specific group by ID

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Group](#model-group) |

---
#### `PUT` `/api/accounts/groups/{id}/`
**Operation ID:** `api_accounts_groups_update`  

Update a group

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this group. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Group`](#model-group)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Group`](#model-group)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Group`](#model-group)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Group](#model-group) |

---
#### `PATCH` `/api/accounts/groups/{id}/`
**Operation ID:** `api_accounts_groups_partial_update`  

Handles CRUD operations for Groups

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this group. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedGroup`](#model-patchedgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `permissions` | Array of integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedGroup`](#model-patchedgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `permissions` | Array of integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedGroup`](#model-patchedgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `permissions` | Array of integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Group](#model-group) |

---
#### `DELETE` `/api/accounts/groups/{id}/`
**Operation ID:** `api_accounts_groups_destroy`  

Delete a group

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/accounts/permissions/`
**Operation ID:** `api_accounts_permissions_list`  

Retrieve a list of all permissions

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [Permission](#model-permission) |

---
#### `POST` `/api/accounts/token/`
**Operation ID:** `api_accounts_token_create`  

Takes a set of user credentials and returns an access and refresh JSON web
token pair to prove the authentication of those credentials.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`TokenObtainPair`](#model-tokenobtainpair)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`TokenObtainPair`](#model-tokenobtainpair)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`TokenObtainPair`](#model-tokenobtainpair)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [TokenObtainPair](#model-tokenobtainpair) |

---
#### `POST` `/api/accounts/token/refresh/`
**Operation ID:** `api_accounts_token_refresh_create`  

Takes a refresh type JSON web token and returns an access type JSON web
token if the refresh token is valid.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`TokenRefresh`](#model-tokenrefresh)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`TokenRefresh`](#model-tokenrefresh)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`TokenRefresh`](#model-tokenrefresh)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [TokenRefresh](#model-tokenrefresh) |

---
#### `GET` `/api/accounts/users/`
**Operation ID:** `api_accounts_users_list`  

Retrieve a list of users

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [User](#model-user) |

---
#### `POST` `/api/accounts/users/`
**Operation ID:** `api_accounts_users_create`  

Create a new user

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`User`](#model-user)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`User`](#model-user)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`User`](#model-user)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [User](#model-user) |

---
#### `GET` `/api/accounts/users/{id}/`
**Operation ID:** `api_accounts_users_retrieve`  

Retrieve a specific user by ID

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [User](#model-user) |

---
#### `PUT` `/api/accounts/users/{id}/`
**Operation ID:** `api_accounts_users_update`  

Update a user

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`User`](#model-user)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`User`](#model-user)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`User`](#model-user)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [User](#model-user) |

---
#### `PATCH` `/api/accounts/users/{id}/`
**Operation ID:** `api_accounts_users_partial_update`  

Handles CRUD operations for Users

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedUser`](#model-patcheduser)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedUser`](#model-patcheduser)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedUser`](#model-patcheduser)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [User](#model-user) |

---
#### `DELETE` `/api/accounts/users/{id}/`
**Operation ID:** `api_accounts_users_destroy`  

Delete a user

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/accounts/users/me/`
**Operation ID:** `api_accounts_users_me_retrieve`  

Get or update active user information. PATCH updates custom_properties with merge semantics.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [User](#model-user) |

---
#### `PATCH` `/api/accounts/users/me/`
**Operation ID:** `api_accounts_users_me_partial_update`  

Get or update active user information. PATCH updates custom_properties with merge semantics.

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedUser`](#model-patcheduser)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedUser`](#model-patcheduser)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedUser`](#model-patcheduser)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [User](#model-user) |

---
### Channels, DVR & Recordings
Total Endpoints: **93**

#### `GET` `/api/channels/channels/`
**Operation ID:** `api_channels_channels_list`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_group` | `query` | string | No |  |
| `epg` | `query` | string | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedChannelList](#model-paginatedchannellist) |

---
#### `POST` `/api/channels/channels/`
**Operation ID:** `api_channels_channels_create`  

Override create to handle channel profile membership

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Channel](#model-channel) |

---
#### `GET` `/api/channels/channels/{channel_id}/streams/`
**Operation ID:** `api_channels_channels_streams_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/channels/channels/{channel_id}/streams/stats/`
**Operation ID:** `api_channels_channels_streams_stats_list`  

Return a minimal stats delta for the streams attached to a channel. Used by the channel table to refresh `stream_stats` on row expand and after a preview closes without re-pulling full stream rows.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | integer | Yes |  |
| `ids` | `query` | string | No | Comma-separated stream IDs to restrict the response to. Combined with `since` via AND. |
| `since` | `query` | string (date-time) | No | ISO 8601 timestamp. Returns only streams whose `stream_stats_updated_at` is strictly newer than this value. Omit to return all streams for the channel. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ChannelStreamStatsDelta](#model-channelstreamstatsdelta) |
| `400` |  | `application/json`: [ChannelStreamStatsErrorResponse](#model-channelstreamstatserrorresponse) |

---
#### `GET` `/api/channels/channels/{id}/`
**Operation ID:** `api_channels_channels_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `PUT` `/api/channels/channels/{id}/`
**Operation ID:** `api_channels_channels_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `PATCH` `/api/channels/channels/{id}/`
**Operation ID:** `api_channels_channels_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedChannel`](#model-patchedchannel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `channel_number` | number (double) | No |  |
| `name` | string | No |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | No |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | No |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | No |  |
| `effective_name` | string | No |  |
| `effective_channel_number` | string | No |  |
| `effective_channel_group_id` | string | No |  |
| `effective_logo_id` | string | No |  |
| `effective_tvg_id` | string | No |  |
| `effective_tvc_guide_stationid` | string | No |  |
| `effective_epg_data_id` | string | No |  |
| `effective_stream_profile_id` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedChannel`](#model-patchedchannel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `channel_number` | number (double) | No |  |
| `name` | string | No |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | No |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | No |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | No |  |
| `effective_name` | string | No |  |
| `effective_channel_number` | string | No |  |
| `effective_channel_group_id` | string | No |  |
| `effective_logo_id` | string | No |  |
| `effective_tvg_id` | string | No |  |
| `effective_tvc_guide_stationid` | string | No |  |
| `effective_epg_data_id` | string | No |  |
| `effective_stream_profile_id` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedChannel`](#model-patchedchannel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `channel_number` | number (double) | No |  |
| `name` | string | No |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | No |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | No |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | No |  |
| `effective_name` | string | No |  |
| `effective_channel_number` | string | No |  |
| `effective_channel_group_id` | string | No |  |
| `effective_logo_id` | string | No |  |
| `effective_tvg_id` | string | No |  |
| `effective_tvc_guide_stationid` | string | No |  |
| `effective_epg_data_id` | string | No |  |
| `effective_stream_profile_id` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `DELETE` `/api/channels/channels/{id}/`
**Operation ID:** `api_channels_channels_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/channels/{id}/match-epg/`
**Operation ID:** `api_channels_channels_match_epg_create_2`  

Try to auto-match this specific channel with EPG data.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/{id}/reorder/`
**Operation ID:** `api_channels_channels_reorder_create`  

Reorder a channel by moving it after another channel (or to the start if insert_after_id is null). The channel will receive the next whole number after the target channel, and all subsequent channels will be renumbered accordingly.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`ReorderChannelRequest`](#model-reorderchannelrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `insert_after_id` | integer | No | ID of the channel to insert after. Use null to move to the beginning. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ReorderChannelRequest`](#model-reorderchannelrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `insert_after_id` | integer | No | ID of the channel to insert after. Use null to move to the beginning. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ReorderChannelRequest`](#model-reorderchannelrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `insert_after_id` | integer | No | ID of the channel to insert after. Use null to move to the beginning. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/{id}/set-epg/`
**Operation ID:** `api_channels_channels_set_epg_create`  

Set EPG data for a channel and refresh program data

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`SetEpgRequest`](#model-setepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `epg_data_id` | integer | Yes | EPG data ID to link |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SetEpgRequest`](#model-setepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `epg_data_id` | integer | Yes | EPG data ID to link |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SetEpgRequest`](#model-setepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `epg_data_id` | integer | Yes | EPG data ID to link |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: object |

---
#### `POST` `/api/channels/channels/assign/`
**Operation ID:** `api_channels_channels_assign_create`  

Auto-assign channel_number in bulk by an ordered list of channel IDs.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`AssignChannelsRequest`](#model-assignchannelsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `starting_number` | number (double) | No | Starting channel number to assign (can be decimal) |
| `channel_ids` | Array of integer | Yes | Channel IDs to assign |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`AssignChannelsRequest`](#model-assignchannelsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `starting_number` | number (double) | No | Starting channel number to assign (can be decimal) |
| `channel_ids` | Array of integer | Yes | Channel IDs to assign |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`AssignChannelsRequest`](#model-assignchannelsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `starting_number` | number (double) | No | Starting channel number to assign (can be decimal) |
| `channel_ids` | Array of integer | Yes | Channel IDs to assign |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/batch-set-epg/`
**Operation ID:** `api_channels_channels_batch_set_epg_create`  

Associate multiple channels with EPG data without triggering a full refresh

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`BatchSetEpgRequest`](#model-batchsetepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `associations` | Array of [EpgAssociation](#model-epgassociation) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`BatchSetEpgRequest`](#model-batchsetepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `associations` | Array of [EpgAssociation](#model-epgassociation) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`BatchSetEpgRequest`](#model-batchsetepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `associations` | Array of [EpgAssociation](#model-epgassociation) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `DELETE` `/api/channels/channels/bulk-delete/`
**Operation ID:** `api_channels_channels_bulk_delete_destroy`  

Bulk delete channels by ID

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/channels/by-uuids/`
**Operation ID:** `api_channels_channels_by_uuids_create`  

Retrieve channels by a list of UUIDs using POST to avoid URL length limitations

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_group` | `query` | string | No |  |
| `epg` | `query` | string | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelByUUIDsRequest`](#model-channelbyuuidsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uuids` | Array of string | Yes | List of channel UUIDs to retrieve |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelByUUIDsRequest`](#model-channelbyuuidsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uuids` | Array of string | Yes | List of channel UUIDs to retrieve |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelByUUIDsRequest`](#model-channelbyuuidsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uuids` | Array of string | Yes | List of channel UUIDs to retrieve |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedChannelList](#model-paginatedchannellist) |

---
#### `PATCH` `/api/channels/channels/edit/bulk/`
**Operation ID:** `api_channels_channels_edit_bulk_partial_update`  

Bulk edit multiple channels in a single request. Accepts a JSON array of channel update objects. Each object must include `id` (the channel's primary key). All other fields are optional and support partial updates. The `streams` field accepts a list of stream IDs and will replace the channel's current stream assignments. All updates are validated before any changes are applied and executed in a single database transaction.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
- **Content-Type:** `application/x-www-form-urlencoded`
- **Content-Type:** `multipart/form-data`

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelBulkEditResponse](#model-channelbulkeditresponse) |
| `400` |  | `application/json`: [ChannelBulkEditErrorResponse](#model-channelbulkediterrorresponse) |

---
#### `POST` `/api/channels/channels/edit/bulk-regex/`
**Operation ID:** `api_channels_channels_edit_bulk_regex_create`  

Bulk rename channel names using a regex find/replace executed server-side. Accepts JavaScript-style named groups (e.g., (?<name>...)) and converts them to Python syntax. Supports flags: 'i' (IGNORECASE). Replacement tokens like $1, $& and $<name> are translated to Python.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`BulkRegexRenameRequest`](#model-bulkregexrenamerequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | Yes |  |
| `find` | string | Yes |  |
| `replace` | string | No |  |
| `flags` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`BulkRegexRenameRequest`](#model-bulkregexrenamerequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | Yes |  |
| `find` | string | Yes |  |
| `replace` | string | No |  |
| `flags` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`BulkRegexRenameRequest`](#model-bulkregexrenamerequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | Yes |  |
| `find` | string | Yes |  |
| `replace` | string | No |  |
| `flags` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/from-stream/`
**Operation ID:** `api_channels_channels_from_stream_create`  

Create a new channel from an existing stream. If 'channel_number' is provided, it will be used (if available); otherwise, the next available channel number is assigned. If 'channel_profile_ids' is provided, the channel will only be added to those profiles. Accepts either a single ID or an array of IDs.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`FromStreamRequest`](#model-fromstreamrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_id` | integer | Yes | ID of the stream to link |
| `channel_number` | number (double) | No | (Optional) Desired channel number. Must not be in use. |
| `name` | string | No | Desired channel name |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`FromStreamRequest`](#model-fromstreamrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_id` | integer | Yes | ID of the stream to link |
| `channel_number` | number (double) | No | (Optional) Desired channel number. Must not be in use. |
| `name` | string | No | Desired channel name |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`FromStreamRequest`](#model-fromstreamrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_id` | integer | Yes | ID of the stream to link |
| `channel_number` | number (double) | No | (Optional) Desired channel number. Must not be in use. |
| `name` | string | No | Desired channel name |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/from-stream/bulk/`
**Operation ID:** `api_channels_channels_from_stream_bulk_create`  

Asynchronously bulk create channels from stream IDs. Returns a task ID to track progress via WebSocket. This is the recommended approach for large bulk operations.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`FromStreamBulkRequest`](#model-fromstreambulkrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_ids` | Array of integer | Yes | List of stream IDs to create channels from |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |
| `starting_channel_number` | integer | No | (Optional) Starting channel number mode: null=use provider numbers, 0=lowest available, other=start from specified number |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`FromStreamBulkRequest`](#model-fromstreambulkrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_ids` | Array of integer | Yes | List of stream IDs to create channels from |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |
| `starting_channel_number` | integer | No | (Optional) Starting channel number mode: null=use provider numbers, 0=lowest available, other=start from specified number |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`FromStreamBulkRequest`](#model-fromstreambulkrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_ids` | Array of integer | Yes | List of stream IDs to create channels from |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |
| `starting_channel_number` | integer | No | (Optional) Starting channel number mode: null=use provider numbers, 0=lowest available, other=start from specified number |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `GET` `/api/channels/channels/ids/`
**Operation ID:** `api_channels_channels_ids_retrieve`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/match-epg/`
**Operation ID:** `api_channels_channels_match_epg_create`  

Kick off a Celery task that tries to fuzzy-match channels with EPG data. If channel_ids are provided, only those channels will be processed.

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`MatchEpgRequest`](#model-matchepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | No | List of channel IDs to process (includes channels that already have EPG). If empty or not provided, only channels without EPG are processed. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`MatchEpgRequest`](#model-matchepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | No | List of channel IDs to process (includes channels that already have EPG). If empty or not provided, only channels without EPG are processed. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`MatchEpgRequest`](#model-matchepgrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | No | List of channel IDs to process (includes channels that already have EPG). If empty or not provided, only channels without EPG are processed. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `GET` `/api/channels/channels/numbers-in-range/`
**Operation ID:** `api_channels_channels_numbers_in_range_retrieve`  

Returns the channels (including those whose effective number is set via override) currently occupying numbers within the given range. Used by the group settings form to surface inline range conflict warnings. Capped at 50 entries to bound the response payload; the frontend only needs to know whether any conflicts exist after filtering, not the entire list.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `end` | `query` | number | No | Inclusive upper bound. If omitted or equal to start, behaves as a single-number lookup. |
| `start` | `query` | number | Yes | Inclusive lower bound of the range to scan. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelsInRangeResponse](#model-channelsinrangeresponse) |

---
#### `POST` `/api/channels/channels/set-logos-from-epg/`
**Operation ID:** `api_channels_channels_set_logos_from_epg_create`  

Trigger a Celery task to set channel logos from EPG data.
Provide channel_ids or epg_source_id (not both).

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/set-names-from-epg/`
**Operation ID:** `api_channels_channels_set_names_from_epg_create`  

Trigger a Celery task to set channel names from EPG data

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `POST` `/api/channels/channels/set-tvg-ids-from-epg/`
**Operation ID:** `api_channels_channels_set_tvg_ids_from_epg_create`  

Trigger a Celery task to set channel TVG-IDs from EPG data

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Channel`](#model-channel)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `GET` `/api/channels/channels/summary/`
**Operation ID:** `api_channels_channels_summary_retrieve`  

Return a lightweight list of channels with only the fields needed by the TV Guide.

The TV Guide is a downstream output surface like HDHR / M3U / EPG /
XC and must reflect the user's overrides. Effective values are
coalesced at the SQL layer; the annotated columns are renamed
back to the raw field names on the way out so the response
shape stays unchanged for the frontend.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Channel](#model-channel) |

---
#### `GET` `/api/channels/dvr/comskip-config/`
**Operation ID:** `api_channels_dvr_comskip_config_retrieve`  

Upload or inspect the custom comskip.ini used by DVR processing.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/channels/dvr/comskip-config/`
**Operation ID:** `api_channels_dvr_comskip_config_create`  

Upload or inspect the custom comskip.ini used by DVR processing.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/channels/groups/`
**Operation ID:** `api_channels_groups_list`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ChannelGroup](#model-channelgroup) |

---
#### `POST` `/api/channels/groups/`
**Operation ID:** `api_channels_groups_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [ChannelGroup](#model-channelgroup) |

---
#### `GET` `/api/channels/groups/{id}/`
**Operation ID:** `api_channels_groups_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelGroup](#model-channelgroup) |

---
#### `PUT` `/api/channels/groups/{id}/`
**Operation ID:** `api_channels_groups_update`  

Override update to check M3U associations

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel group. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelGroup](#model-channelgroup) |

---
#### `PATCH` `/api/channels/groups/{id}/`
**Operation ID:** `api_channels_groups_partial_update`  

Override partial_update to check M3U associations

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel group. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedChannelGroup`](#model-patchedchannelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channel_count` | string | No |  |
| `m3u_account_count` | string | No |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedChannelGroup`](#model-patchedchannelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channel_count` | string | No |  |
| `m3u_account_count` | string | No |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedChannelGroup`](#model-patchedchannelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channel_count` | string | No |  |
| `m3u_account_count` | string | No |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelGroup](#model-channelgroup) |

---
#### `DELETE` `/api/channels/groups/{id}/`
**Operation ID:** `api_channels_groups_destroy`  

Override destroy to check for associations before deletion

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/groups/cleanup/`
**Operation ID:** `api_channels_groups_cleanup_create`  

Delete all channel groups that have no associations (no channels or M3U accounts)

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelGroup`](#model-channelgroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelGroup](#model-channelgroup) |

---
#### `GET` `/api/channels/logos/`
**Operation ID:** `api_channels_logos_list`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedLogoList](#model-paginatedlogolist) |

---
#### `POST` `/api/channels/logos/`
**Operation ID:** `api_channels_logos_create`  

Create a new logo entry

**Request Body:**
- **Required:** `True`
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |
- **Content-Type:** `application/json`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Logo](#model-logo) |

---
#### `GET` `/api/channels/logos/{id}/`
**Operation ID:** `api_channels_logos_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this logo. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Logo](#model-logo) |

---
#### `PUT` `/api/channels/logos/{id}/`
**Operation ID:** `api_channels_logos_update`  

Update an existing logo

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this logo. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |
- **Content-Type:** `application/json`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Logo](#model-logo) |

---
#### `PATCH` `/api/channels/logos/{id}/`
**Operation ID:** `api_channels_logos_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this logo. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedLogo`](#model-patchedlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `channel_count` | string | No |  |
| `is_used` | string | No |  |
| `channel_names` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedLogo`](#model-patchedlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `channel_count` | string | No |  |
| `is_used` | string | No |  |
| `channel_names` | string | No |  |
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedLogo`](#model-patchedlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `channel_count` | string | No |  |
| `is_used` | string | No |  |
| `channel_names` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Logo](#model-logo) |

---
#### `DELETE` `/api/channels/logos/{id}/`
**Operation ID:** `api_channels_logos_destroy`  

Delete a logo and remove it from any channels using it

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this logo. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/channels/logos/{id}/cache/`
**Operation ID:** `api_channels_logos_cache_retrieve`  

Streams the logo file, whether it's local or remote.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this logo. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Logo](#model-logo) |

---
#### `DELETE` `/api/channels/logos/bulk-delete/`
**Operation ID:** `api_channels_logos_bulk_delete_destroy`  

Bulk delete logos by ID

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/logos/cleanup/`
**Operation ID:** `api_channels_logos_cleanup_create`  

Delete all channel logos that are not used by any channels

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`CleanupUnusedLogosRequest`](#model-cleanupunusedlogosrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `delete_files` | boolean | No | Whether to delete local logo files from disk |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`CleanupUnusedLogosRequest`](#model-cleanupunusedlogosrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `delete_files` | boolean | No | Whether to delete local logo files from disk |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`CleanupUnusedLogosRequest`](#model-cleanupunusedlogosrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `delete_files` | boolean | No | Whether to delete local logo files from disk |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/channels/logos/upload/`
**Operation ID:** `api_channels_logos_upload_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |
- **Content-Type:** `application/json`
  - **Schema:** [`Logo`](#model-logo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Logo](#model-logo) |

---
#### `GET` `/api/channels/profiles/`
**Operation ID:** `api_channels_profiles_list`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ChannelProfile](#model-channelprofile) |

---
#### `POST` `/api/channels/profiles/`
**Operation ID:** `api_channels_profiles_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [ChannelProfile](#model-channelprofile) |

---
#### `GET` `/api/channels/profiles/{id}/`
**Operation ID:** `api_channels_profiles_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelProfile](#model-channelprofile) |

---
#### `PUT` `/api/channels/profiles/{id}/`
**Operation ID:** `api_channels_profiles_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel profile. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelProfile](#model-channelprofile) |

---
#### `PATCH` `/api/channels/profiles/{id}/`
**Operation ID:** `api_channels_profiles_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel profile. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedChannelProfile`](#model-patchedchannelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channels` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedChannelProfile`](#model-patchedchannelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channels` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedChannelProfile`](#model-patchedchannelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channels` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelProfile](#model-channelprofile) |

---
#### `DELETE` `/api/channels/profiles/{id}/`
**Operation ID:** `api_channels_profiles_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/profiles/{id}/duplicate/`
**Operation ID:** `api_channels_profiles_duplicate_create`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this channel profile. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ChannelProfile`](#model-channelprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ChannelProfile](#model-channelprofile) |

---
#### `PATCH` `/api/channels/profiles/{profile_id}/channels/{channel_id}/`
**Operation ID:** `api_channels_profiles_channels_partial_update`  

Enable or disable a channel for a specific group

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | integer | Yes |  |
| `profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `PATCH` `/api/channels/profiles/{profile_id}/channels/bulk-update/`
**Operation ID:** `api_channels_profiles_channels_bulk_update_partial_update`  

Bulk enable or disable channels for a specific profile. Creates membership records if they don't exist.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `profile_id` | `path` | integer | Yes |  |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedBulkChannelProfileMembership`](#model-patchedbulkchannelprofilemembership)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channels` | Array of [ChanneProfilelMembershipUpdate](#model-channeprofilelmembershipupdate) | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedBulkChannelProfileMembership`](#model-patchedbulkchannelprofilemembership)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channels` | Array of [ChanneProfilelMembershipUpdate](#model-channeprofilelmembershipupdate) | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedBulkChannelProfileMembership`](#model-patchedbulkchannelprofilemembership)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channels` | Array of [ChanneProfilelMembershipUpdate](#model-channeprofilelmembershipupdate) | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/channels/recordings/`
**Operation ID:** `api_channels_recordings_list`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [Recording](#model-recording) |

---
#### `POST` `/api/channels/recordings/`
**Operation ID:** `api_channels_recordings_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Recording](#model-recording) |

---
#### `GET` `/api/channels/recordings/{id}/`
**Operation ID:** `api_channels_recordings_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `PUT` `/api/channels/recordings/{id}/`
**Operation ID:** `api_channels_recordings_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `PATCH` `/api/channels/recordings/{id}/`
**Operation ID:** `api_channels_recordings_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedRecording`](#model-patchedrecording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `task_id` | string | No |  |
| `custom_properties` | object | No |  |
| `channel` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedRecording`](#model-patchedrecording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `task_id` | string | No |  |
| `custom_properties` | object | No |  |
| `channel` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedRecording`](#model-patchedrecording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `task_id` | string | No |  |
| `custom_properties` | object | No |  |
| `channel` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `DELETE` `/api/channels/recordings/{id}/`
**Operation ID:** `api_channels_recordings_destroy`  

Delete the Recording and ensure any active DVR client connection is closed.

Also removes the associated file(s) from disk if present.

Operation order matters for correctness:
  1. Delete the DB record first — run_recording's cancellation guard
     (Recording.objects.filter(id=...).exists()) will now return False,
     preventing it from saving 'interrupted' status or sending
     recording_ended after the stream is torn down.
  2. Send recording_cancelled WebSocket immediately so the frontend
     removes the card without waiting for the slow DVR client teardown.
  3. Spawn a background thread to stop the DVR client and delete files.
     This mirrors the stop() endpoint's approach and avoids the 5-15 s
     delay that _stop_dvr_clients() can introduce.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/recordings/{id}/comskip/`
**Operation ID:** `api_channels_recordings_comskip_create`  

Trigger comskip processing for this recording.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `POST` `/api/channels/recordings/{id}/extend/`
**Operation ID:** `api_channels_recordings_extend_create`  

Extend an in-progress recording's end_time without interrupting the stream.

The running task re-reads end_time every ~2 s and adjusts its deadline
dynamically.  The pre_save signal skips task revocation while the
recording status is 'recording'.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `GET` `/api/channels/recordings/{id}/file/`
**Operation ID:** `api_channels_recordings_file_retrieve`  

Stream a completed recording file with HTTP Range support for seeking.

For in-progress recordings, file_url in custom_properties points to
/hls/index.m3u8.  If a client hits this endpoint while the recording
is still running (or the MKV is not yet produced), it is redirected to
the HLS playlist endpoint.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `GET` `/api/channels/recordings/{id}/hls/{seg_path}`
**Operation ID:** `api_channels_recordings_hls_retrieve`  

Serve HLS playlist and segment files for an in-progress (or completed) recording.

Clients connecting during recording should use the m3u8 URL returned in
custom_properties.file_url.  Segment URLs inside the playlist are rewritten
to route through this endpoint so authentication and path isolation are
preserved.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes |  |
| `seg_path` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `GET` `/api/channels/recordings/{id}/hls/{seg_path}/`
**Operation ID:** `api_channels_recordings_hls_retrieve_2`  

Serve HLS playlist and segment files for an in-progress (or completed) recording.

Clients connecting during recording should use the m3u8 URL returned in
custom_properties.file_url.  Segment URLs inside the playlist are rewritten
to route through this endpoint so authentication and path isolation are
preserved.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |
| `seg_path` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `POST` `/api/channels/recordings/{id}/refresh-artwork/`
**Operation ID:** `api_channels_recordings_refresh_artwork_create`  

Re-run the poster resolution pipeline for this recording.

Useful when a recording fell back to a channel logo or default logo
because external sources were temporarily unavailable.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `POST` `/api/channels/recordings/{id}/stop/`
**Operation ID:** `api_channels_recordings_stop_create`  

Stop a recording early while retaining the partial content for playback.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `POST` `/api/channels/recordings/{id}/update-metadata/`
**Operation ID:** `api_channels_recordings_update_metadata_create`  

Update user-editable recording metadata (title, description).

Sets user_edited flag to prevent EPG auto-enrichment from overwriting
the user's changes on subsequent task runs.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recording. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Recording`](#model-recording)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Recording](#model-recording) |

---
#### `POST` `/api/channels/recordings/bulk-delete-upcoming/`
**Operation ID:** `api_channels_recordings_bulk_delete_upcoming_create`  

Delete all upcoming (future) recordings.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/channels/recurring-rules/`
**Operation ID:** `api_channels_recurring_rules_list`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [RecurringRecordingRule](#model-recurringrecordingrule) |

---
#### `POST` `/api/channels/recurring-rules/`
**Operation ID:** `api_channels_recurring_rules_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`RecurringRecordingRule`](#model-recurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`RecurringRecordingRule`](#model-recurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`RecurringRecordingRule`](#model-recurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [RecurringRecordingRule](#model-recurringrecordingrule) |

---
#### `GET` `/api/channels/recurring-rules/{id}/`
**Operation ID:** `api_channels_recurring_rules_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recurring recording rule. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [RecurringRecordingRule](#model-recurringrecordingrule) |

---
#### `PUT` `/api/channels/recurring-rules/{id}/`
**Operation ID:** `api_channels_recurring_rules_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recurring recording rule. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`RecurringRecordingRule`](#model-recurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`RecurringRecordingRule`](#model-recurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`RecurringRecordingRule`](#model-recurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [RecurringRecordingRule](#model-recurringrecordingrule) |

---
#### `PATCH` `/api/channels/recurring-rules/{id}/`
**Operation ID:** `api_channels_recurring_rules_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recurring recording rule. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedRecurringRecordingRule`](#model-patchedrecurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | No |  |
| `end_time` | string (time) | No |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |
| `channel` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedRecurringRecordingRule`](#model-patchedrecurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | No |  |
| `end_time` | string (time) | No |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |
| `channel` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedRecurringRecordingRule`](#model-patchedrecurringrecordingrule)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | No |  |
| `end_time` | string (time) | No |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |
| `channel` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [RecurringRecordingRule](#model-recurringrecordingrule) |

---
#### `DELETE` `/api/channels/recurring-rules/{id}/`
**Operation ID:** `api_channels_recurring_rules_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this recurring recording rule. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/channels/series-rules/`
**Summary:** List all series rules  
**Operation ID:** `api_channels_series_rules_retrieve`  

Retrieve all configured DVR series recording rules.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/channels/series-rules/`
**Summary:** Create or update a series rule  
**Operation ID:** `api_channels_series_rules_create`  

Add a new series recording rule or update an existing one. Rules will be evaluated immediately to find matching episodes.

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`SeriesRuleRequest`](#model-seriesrulerequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to match across all channels. |
| `mode` | object | No | all: record all episodes, new: record only new episodes<br><br>* `all` - all<br>* `new` - new |
| `title` | string | No | Series title |
| `title_mode` | object | No | How to match the title field<br><br>* `exact` - exact<br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `description` | string | No | Optional description match expression |
| `description_mode` | object | No | How to match the description field<br><br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `channel_id` | integer | No | Optional channel to pin recordings to (defaults to lowest-numbered channel for the EPG) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SeriesRuleRequest`](#model-seriesrulerequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to match across all channels. |
| `mode` | object | No | all: record all episodes, new: record only new episodes<br><br>* `all` - all<br>* `new` - new |
| `title` | string | No | Series title |
| `title_mode` | object | No | How to match the title field<br><br>* `exact` - exact<br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `description` | string | No | Optional description match expression |
| `description_mode` | object | No | How to match the description field<br><br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `channel_id` | integer | No | Optional channel to pin recordings to (defaults to lowest-numbered channel for the EPG) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SeriesRuleRequest`](#model-seriesrulerequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to match across all channels. |
| `mode` | object | No | all: record all episodes, new: record only new episodes<br><br>* `all` - all<br>* `new` - new |
| `title` | string | No | Series title |
| `title_mode` | object | No | How to match the title field<br><br>* `exact` - exact<br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `description` | string | No | Optional description match expression |
| `description_mode` | object | No | How to match the description field<br><br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `channel_id` | integer | No | Optional channel to pin recordings to (defaults to lowest-numbered channel for the EPG) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `DELETE` `/api/channels/series-rules/`
**Summary:** Delete a series rule  
**Operation ID:** `api_channels_series_rules_destroy`  

Remove a series recording rule by tvg_id + title and clean up future scheduled recordings.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `title` | `query` | string | No | Series title |
| `tvg_id` | `query` | string | No | Channel TVG ID (may be blank for title-only rules) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/series-rules/bulk-remove/`
**Summary:** Bulk remove scheduled recordings for a series  
**Operation ID:** `api_channels_series_rules_bulk_remove_create`  

Delete future scheduled recordings for a series rule. Useful for stopping a rule without losing the configuration. Matches by channel and optionally by series title.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`BulkRemoveSeriesRecordingsRequest`](#model-bulkremoveseriesrecordingsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | Yes | Channel TVG ID (required) |
| `title` | string | No | Series title - when scope=title, only recordings matching this title are removed |
| `scope` | object | No | title: remove only matching title on channel, channel: remove all future recordings on channel<br><br>* `title` - title<br>* `channel` - channel |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`BulkRemoveSeriesRecordingsRequest`](#model-bulkremoveseriesrecordingsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | Yes | Channel TVG ID (required) |
| `title` | string | No | Series title - when scope=title, only recordings matching this title are removed |
| `scope` | object | No | title: remove only matching title on channel, channel: remove all future recordings on channel<br><br>* `title` - title<br>* `channel` - channel |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`BulkRemoveSeriesRecordingsRequest`](#model-bulkremoveseriesrecordingsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | Yes | Channel TVG ID (required) |
| `title` | string | No | Series title - when scope=title, only recordings matching this title are removed |
| `scope` | object | No | title: remove only matching title on channel, channel: remove all future recordings on channel<br><br>* `title` - title<br>* `channel` - channel |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/channels/series-rules/evaluate/`
**Summary:** Evaluate series rules  
**Operation ID:** `api_channels_series_rules_evaluate_create`  

Trigger evaluation of series recording rules to find and schedule matching episodes. Can evaluate all rules or a specific channel.

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`EvaluateSeriesRulesRequest`](#model-evaluateseriesrulesrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional: evaluate only rules for this channel TVG ID. If omitted, all rules are evaluated. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EvaluateSeriesRulesRequest`](#model-evaluateseriesrulesrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional: evaluate only rules for this channel TVG ID. If omitted, all rules are evaluated. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EvaluateSeriesRulesRequest`](#model-evaluateseriesrulesrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional: evaluate only rules for this channel TVG ID. If omitted, all rules are evaluated. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/channels/series-rules/preview/`
**Summary:** Preview series rule matches  
**Operation ID:** `api_channels_series_rules_preview_create`  

Return upcoming programs that the given rule would match without persisting the rule.

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`SeriesRulePreviewRequest`](#model-seriesrulepreviewrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to search across all channels. |
| `mode` | object | No |  |
| `title` | string | No |  |
| `title_mode` | object | No |  |
| `description` | string | No |  |
| `description_mode` | object | No |  |
| `limit` | integer | No | Max programs to return (default 25, max 100) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SeriesRulePreviewRequest`](#model-seriesrulepreviewrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to search across all channels. |
| `mode` | object | No |  |
| `title` | string | No |  |
| `title_mode` | object | No |  |
| `description` | string | No |  |
| `description_mode` | object | No |  |
| `limit` | integer | No | Max programs to return (default 25, max 100) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SeriesRulePreviewRequest`](#model-seriesrulepreviewrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to search across all channels. |
| `mode` | object | No |  |
| `title` | string | No |  |
| `title_mode` | object | No |  |
| `description` | string | No |  |
| `description_mode` | object | No |  |
| `limit` | integer | No | Max programs to return (default 25, max 100) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/channels/streams/`
**Operation ID:** `api_channels_streams_list`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_group_name` | `query` | string | No |  |
| `m3u_account` | `query` | Array of integer | No | Multiple values may be separated by commas. |
| `m3u_account_is_active` | `query` | boolean | No |  |
| `m3u_account_name` | `query` | string | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |
| `tvg_id` | `query` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedStreamList](#model-paginatedstreamlist) |

---
#### `POST` `/api/channels/streams/`
**Operation ID:** `api_channels_streams_create`  
**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`Stream`](#model-stream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Stream`](#model-stream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Stream`](#model-stream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Stream](#model-stream) |

---
#### `GET` `/api/channels/streams/{id}/`
**Operation ID:** `api_channels_streams_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Stream. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Stream](#model-stream) |

---
#### `PUT` `/api/channels/streams/{id}/`
**Operation ID:** `api_channels_streams_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Stream. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`Stream`](#model-stream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Stream`](#model-stream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Stream`](#model-stream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Stream](#model-stream) |

---
#### `PATCH` `/api/channels/streams/{id}/`
**Operation ID:** `api_channels_streams_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Stream. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedStream`](#model-patchedstream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | No |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedStream`](#model-patchedstream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | No |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedStream`](#model-patchedstream)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | No |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Stream](#model-stream) |

---
#### `DELETE` `/api/channels/streams/{id}/`
**Operation ID:** `api_channels_streams_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Stream. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `DELETE` `/api/channels/streams/bulk-delete/`
**Operation ID:** `api_channels_streams_bulk_delete_destroy`  

Bulk delete streams by ID

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/channels/streams/by-ids/`
**Operation ID:** `api_channels_streams_by_ids_create`  

Retrieve streams by a list of IDs using POST to avoid URL length limitations

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_group_name` | `query` | string | No |  |
| `m3u_account` | `query` | Array of integer | No | Multiple values may be separated by commas. |
| `m3u_account_is_active` | `query` | boolean | No |  |
| `m3u_account_name` | `query` | string | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |
| `tvg_id` | `query` | string | No |  |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`StreamByIdsRequest`](#model-streambyidsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ids` | Array of integer | Yes | List of stream IDs to retrieve |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`StreamByIdsRequest`](#model-streambyidsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ids` | Array of integer | Yes | List of stream IDs to retrieve |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`StreamByIdsRequest`](#model-streambyidsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ids` | Array of integer | Yes | List of stream IDs to retrieve |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedStreamList](#model-paginatedstreamlist) |

---
#### `GET` `/api/channels/streams/filter-options/`
**Operation ID:** `api_channels_streams_filter_options_retrieve`  

Get available filter options based on current filter state.
Uses a hierarchical approach: M3U is the parent filter, Group filters based on M3U.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Stream](#model-stream) |

---
#### `GET` `/api/channels/streams/groups/`
**Operation ID:** `api_channels_streams_groups_retrieve`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Stream](#model-stream) |

---
#### `GET` `/api/channels/streams/ids/`
**Operation ID:** `api_channels_streams_ids_retrieve`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Stream](#model-stream) |

---
#### `GET` `/api/channels/streams/regex-preview/`
**Operation ID:** `api_channels_streams_regex_preview_retrieve`  

Returns regex preview info for a group's streams. Used by the auto-sync gear modal so users can see how their find/replace or filter pattern affects real stream names before saving. Caps in-memory iteration at SCAN_CAP streams per call so the endpoint stays bounded even on groups with tens of thousands of streams; the caller surfaces total_in_group and scan_limit_hit so users know whether the preview is complete.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_group` | `query` | string | Yes | Channel group name to scope the preview to. |
| `exclude` | `query` | string | No | Filter regex for the exclude preview. When supplied, the response includes exclude_matches and exclude_match_count. |
| `find` | `query` | string | No | Find regex for the rename preview. When supplied, the response includes find_matches and find_match_count. |
| `limit` | `query` | integer | No | Max preview entries per match list (default 10, capped at 50). |
| `match` | `query` | string | No | Filter regex for the include preview. When supplied, the response includes filter_matches and filter_match_count. |
| `replace` | `query` | string | No | Replacement string used with the find pattern. Defaults to empty string when omitted. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [StreamRegexPreviewResponse](#model-streamregexpreviewresponse) |

---
### EPG (Electronic Program Guide)
Total Endpoints: **24**

#### `POST` `/api/epg/current-programs/`
**Operation ID:** `api_epg_current_programs_create`  

Get currently playing programs for specified channels or all channels

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`CurrentProgramsRequest`](#model-currentprogramsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_uuids` | Array of string | No | Array of channel UUIDs. If null or omitted, returns all channels with current programs. |
| `epg_data_ids` | Array of integer | No | Array of EPG data IDs. Can be used instead of channel_ids. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`CurrentProgramsRequest`](#model-currentprogramsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_uuids` | Array of string | No | Array of channel UUIDs. If null or omitted, returns all channels with current programs. |
| `epg_data_ids` | Array of integer | No | Array of EPG data IDs. Can be used instead of channel_ids. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`CurrentProgramsRequest`](#model-currentprogramsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_uuids` | Array of string | No | Array of channel UUIDs. If null or omitted, returns all channels with current programs. |
| `epg_data_ids` | Array of integer | No | Array of EPG data IDs. Can be used instead of channel_ids. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ProgramData](#model-programdata) |

---
#### `GET` `/api/epg/epgdata/`
**Operation ID:** `api_epg_epgdata_list`  

API endpoint that allows EPGData objects to be viewed.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [EPGData](#model-epgdata) |

---
#### `GET` `/api/epg/epgdata/{id}/`
**Operation ID:** `api_epg_epgdata_retrieve`  

API endpoint that allows EPGData objects to be viewed.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg data. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGData](#model-epgdata) |

---
#### `GET` `/api/epg/grid/`
**Operation ID:** `api_epg_grid_list`  

Retrieve programs from the previous hour, currently running and upcoming for the next 24 hours

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ProgramData](#model-programdata) |

---
#### `POST` `/api/epg/import/`
**Operation ID:** `api_epg_import_create`  

Triggers an EPG data refresh for the given source.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EPGImportRequest`](#model-epgimportrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the EPG source to refresh. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EPGImportRequest`](#model-epgimportrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the EPG source to refresh. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EPGImportRequest`](#model-epgimportrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the EPG source to refresh. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/epg/programs/`
**Operation ID:** `api_epg_programs_list`  

Handles CRUD operations for EPG programs

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ProgramData](#model-programdata) |

---
#### `POST` `/api/epg/programs/`
**Operation ID:** `api_epg_programs_create`  

Handles CRUD operations for EPG programs

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ProgramData`](#model-programdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ProgramData`](#model-programdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ProgramData`](#model-programdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [ProgramData](#model-programdata) |

---
#### `GET` `/api/epg/programs/{id}/`
**Operation ID:** `api_epg_programs_retrieve`  

Handles CRUD operations for EPG programs

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this program data. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ProgramDetail](#model-programdetail) |

---
#### `PUT` `/api/epg/programs/{id}/`
**Operation ID:** `api_epg_programs_update`  

Handles CRUD operations for EPG programs

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this program data. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ProgramData`](#model-programdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ProgramData`](#model-programdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ProgramData`](#model-programdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ProgramData](#model-programdata) |

---
#### `PATCH` `/api/epg/programs/{id}/`
**Operation ID:** `api_epg_programs_partial_update`  

Handles CRUD operations for EPG programs

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this program data. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedProgramData`](#model-patchedprogramdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `title` | string | No |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedProgramData`](#model-patchedprogramdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `title` | string | No |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedProgramData`](#model-patchedprogramdata)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `title` | string | No |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ProgramData](#model-programdata) |

---
#### `DELETE` `/api/epg/programs/{id}/`
**Operation ID:** `api_epg_programs_destroy`  

Handles CRUD operations for EPG programs

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this program data. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/epg/programs/{id}/poster/`
**Operation ID:** `api_epg_programs_poster_retrieve`  

Proxy endpoint for SD program poster images. Nginx caches the response.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this program data. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ProgramData](#model-programdata) |

---
#### `GET` `/api/epg/programs/search/`
**Summary:** Search EPG programs  
**Operation ID:** `api_epg_programs_search_list`  


**Advanced EPG program search with multiple filter types and complex query support.**

### Text Search Features

**Title and Description Search**:
- Supports AND/OR logical operators (case-insensitive: `and`/`AND` both work)
- Wrap phrases in double quotes to match them literally: `"Law and Order"`
- Parenthetical grouping for complex queries: `(Newcastle OR NEW) AND (Villa OR AST)`
- Regex pattern matching with `title_regex=true` (evaluated by the database engine)
- Whole word matching with `title_whole_words=true` to avoid partial matches

**Examples**:
- Simple: `title=football`
- AND operator: `title=premier AND league`
- OR operator: `title=Newcastle OR Villa`
- Quoted phrase: `title="Law and Order"` (matches the exact phrase; 'and' is literal)
- Mixed: `title="Law and Order" AND crime`
- Nested groups: `title=(Newcastle OR NEW) AND (Villa OR AST)`
- Regex: `title=^Premier&title_regex=true` (programs starting with "Premier")
- Whole words: `title=NEW&title_whole_words=true` (matches "NEW" but not "News")

### Time Filtering

**airing_at**: Find programs airing at a specific moment (start_time ≤ airing_at < end_time)

**Time ranges**: Use combinations of start_after, start_before, end_after, end_before

### Response Customization

**fields**: Comma-separated list to include only specific fields in response
- Available: id, title, sub_title, description, start_time, end_time, tvg_id, custom_properties, epg_source, epg_name, epg_icon_url, channels, streams

### Pagination

- Default: 50 results per page
- Maximum: 500 results per page
- Use `page` and `page_size` parameters to navigate results
        

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `airing_at` | `query` | string (date-time) | No | Find programs airing at this exact moment (start_time ≤ airing_at < end_time). ISO 8601 format, e.g. `2026-02-14T20:00:00Z`. |
| `channel` | `query` | string | No | Filter by channel name (case-insensitive substring match). e.g. `BBC One`, `Sky Sports`. |
| `channel_id` | `query` | integer | No | Filter by exact channel ID. |
| `description` | `query` | string | No | Description search query. Same syntax and features as title search. |
| `description_regex` | `query` | boolean | No | Enable regex matching for description (case-insensitive, default: false). |
| `description_whole_words` | `query` | boolean | No | Match whole words only in description (default: false). Same behaviour as title_whole_words. |
| `end_after` | `query` | string (date-time) | No | Filter programs ending at or after this time. ISO 8601 format. |
| `end_before` | `query` | string (date-time) | No | Filter programs ending at or before this time. ISO 8601 format. |
| `epg_source` | `query` | integer | No | Filter by EPG source ID. |
| `fields` | `query` | string | No | Comma-separated list of fields to include. Omit to return all fields. e.g. `title,start_time,end_time`. |
| `group` | `query` | string | No | Filter by channel group or stream group name (case-insensitive substring match). e.g. `Sports`, `UK Channels`. |
| `page` | `query` | integer | No | Page number for pagination (default: 1). |
| `page_size` | `query` | integer | No | Results per page (default: 50, max: 500). |
| `start_after` | `query` | string (date-time) | No | Filter programs starting at or after this time. ISO 8601 format, e.g. `2026-02-14T18:00:00Z`. |
| `start_before` | `query` | string (date-time) | No | Filter programs starting at or before this time. ISO 8601 format. |
| `stream` | `query` | string | No | Filter by stream name (case-insensitive substring match). |
| `title` | `query` | string | No | Title search query. Supports AND/OR operators (case-insensitive), quoted phrases, and parentheses. Double-quote a phrase to match it literally: `"Law and Order"`. Unquoted space-separated terms are matched as a phrase; use AND/OR to combine separate terms. |
| `title_regex` | `query` | boolean | No | Enable regex matching for title (case-insensitive, default: false). e.g. `^The` matches titles starting with "The". |
| `title_whole_words` | `query` | boolean | No | Match whole words only in title (default: false). e.g. `new` matches "Newcastle" normally but not with whole words enabled. |
| `tvg_id` | `query` | string | No | Filter by EPG tvg_id (exact match). e.g. `bbcone.uk`. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ProgramSearchResult](#model-programsearchresult) |

---
#### `GET` `/api/epg/sources/`
**Operation ID:** `api_epg_sources_list`  

API endpoint that allows EPG sources to be viewed or edited.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [EPGSource](#model-epgsource) |

---
#### `POST` `/api/epg/sources/`
**Operation ID:** `api_epg_sources_create`  

API endpoint that allows EPG sources to be viewed or edited.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `GET` `/api/epg/sources/{id}/`
**Operation ID:** `api_epg_sources_retrieve`  

API endpoint that allows EPG sources to be viewed or edited.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `PUT` `/api/epg/sources/{id}/`
**Operation ID:** `api_epg_sources_update`  

API endpoint that allows EPG sources to be viewed or edited.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `PATCH` `/api/epg/sources/{id}/`
**Operation ID:** `api_epg_sources_partial_update`  

Handle partial updates with special logic for is_active field

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedEPGSource`](#model-patchedepgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | No | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | No | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | No |  |
| `has_channels` | boolean | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedEPGSource`](#model-patchedepgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | No | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | No | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | No |  |
| `has_channels` | boolean | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedEPGSource`](#model-patchedepgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | No | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | No | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | No |  |
| `has_channels` | boolean | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `DELETE` `/api/epg/sources/{id}/`
**Operation ID:** `api_epg_sources_destroy`  

API endpoint that allows EPG sources to be viewed or edited.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/epg/sources/{id}/sd-lineups/`
**Operation ID:** `api_epg_sources_sd_lineups_retrieve`  

GET    — list lineups currently on the SD account
POST   — add a lineup (body: {"lineup": "USA-NJ29486-X"})
DELETE — remove a lineup (body: {"lineup": "USA-NJ29486-X"})

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `POST` `/api/epg/sources/{id}/sd-lineups/`
**Operation ID:** `api_epg_sources_sd_lineups_create`  

GET    — list lineups currently on the SD account
POST   — add a lineup (body: {"lineup": "USA-NJ29486-X"})
DELETE — remove a lineup (body: {"lineup": "USA-NJ29486-X"})

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `DELETE` `/api/epg/sources/{id}/sd-lineups/`
**Operation ID:** `api_epg_sources_sd_lineups_destroy`  

GET    — list lineups currently on the SD account
POST   — add a lineup (body: {"lineup": "USA-NJ29486-X"})
DELETE — remove a lineup (body: {"lineup": "USA-NJ29486-X"})

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/epg/sources/{id}/sd-lineups/search/`
**Operation ID:** `api_epg_sources_sd_lineups_search_create`  

Search available headends/lineups by country and postal code.
Body: {"country": "USA", "postalcode": "07030"}
Returns a flat list of lineups across all matching headends.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this epg source. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
#### `POST` `/api/epg/sources/upload/`
**Operation ID:** `api_epg_sources_upload_create`  

API endpoint that allows EPG sources to be viewed or edited.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EPGSource`](#model-epgsource)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EPGSource](#model-epgsource) |

---
### M3U Management
Total Endpoints: **31**

#### `GET` `/api/m3u/accounts/`
**Operation ID:** `api_m3u_accounts_list`  

Handles CRUD operations for M3U accounts

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [M3UAccount](#model-m3uaccount) |

---
#### `POST` `/api/m3u/accounts/`
**Operation ID:** `api_m3u_accounts_create`  

Handles CRUD operations for M3U accounts

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [M3UAccount](#model-m3uaccount) |

---
#### `GET` `/api/m3u/accounts/{account_id}/filters/`
**Operation ID:** `api_m3u_accounts_filters_list`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [M3UFilter](#model-m3ufilter) |

---
#### `POST` `/api/m3u/accounts/{account_id}/filters/`
**Operation ID:** `api_m3u_accounts_filters_create`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UFilter`](#model-m3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UFilter`](#model-m3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UFilter`](#model-m3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [M3UFilter](#model-m3ufilter) |

---
#### `GET` `/api/m3u/accounts/{account_id}/filters/{id}/`
**Operation ID:** `api_m3u_accounts_filters_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u filter. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UFilter](#model-m3ufilter) |

---
#### `PUT` `/api/m3u/accounts/{account_id}/filters/{id}/`
**Operation ID:** `api_m3u_accounts_filters_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u filter. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UFilter`](#model-m3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UFilter`](#model-m3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UFilter`](#model-m3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UFilter](#model-m3ufilter) |

---
#### `PATCH` `/api/m3u/accounts/{account_id}/filters/{id}/`
**Operation ID:** `api_m3u_accounts_filters_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u filter. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedM3UFilter`](#model-patchedm3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | No | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedM3UFilter`](#model-patchedm3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | No | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedM3UFilter`](#model-patchedm3ufilter)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | No | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UFilter](#model-m3ufilter) |

---
#### `DELETE` `/api/m3u/accounts/{account_id}/filters/{id}/`
**Operation ID:** `api_m3u_accounts_filters_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u filter. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/m3u/accounts/{account_id}/profiles/`
**Operation ID:** `api_m3u_accounts_profiles_list`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [M3UAccountProfile](#model-m3uaccountprofile) |

---
#### `POST` `/api/m3u/accounts/{account_id}/profiles/`
**Operation ID:** `api_m3u_accounts_profiles_create`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UAccountProfile`](#model-m3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UAccountProfile`](#model-m3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UAccountProfile`](#model-m3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [M3UAccountProfile](#model-m3uaccountprofile) |

---
#### `GET` `/api/m3u/accounts/{account_id}/profiles/{id}/`
**Operation ID:** `api_m3u_accounts_profiles_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccountProfile](#model-m3uaccountprofile) |

---
#### `PUT` `/api/m3u/accounts/{account_id}/profiles/{id}/`
**Operation ID:** `api_m3u_accounts_profiles_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account profile. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UAccountProfile`](#model-m3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UAccountProfile`](#model-m3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UAccountProfile`](#model-m3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccountProfile](#model-m3uaccountprofile) |

---
#### `PATCH` `/api/m3u/accounts/{account_id}/profiles/{id}/`
**Operation ID:** `api_m3u_accounts_profiles_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account profile. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedM3UAccountProfile`](#model-patchedm3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedM3UAccountProfile`](#model-patchedm3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedM3UAccountProfile`](#model-patchedm3uaccountprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccountProfile](#model-m3uaccountprofile) |

---
#### `DELETE` `/api/m3u/accounts/{account_id}/profiles/{id}/`
**Operation ID:** `api_m3u_accounts_profiles_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | string | Yes |  |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/m3u/accounts/{id}/`
**Operation ID:** `api_m3u_accounts_retrieve`  

Handles CRUD operations for M3U accounts

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccount](#model-m3uaccount) |

---
#### `PUT` `/api/m3u/accounts/{id}/`
**Operation ID:** `api_m3u_accounts_update`  

Handles CRUD operations for M3U accounts

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccount](#model-m3uaccount) |

---
#### `PATCH` `/api/m3u/accounts/{id}/`
**Operation ID:** `api_m3u_accounts_partial_update`  

Handle partial updates with special logic for is_active field

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedM3UAccount`](#model-patchedm3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedM3UAccount`](#model-patchedm3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedM3UAccount`](#model-patchedm3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccount](#model-m3uaccount) |

---
#### `DELETE` `/api/m3u/accounts/{id}/`
**Operation ID:** `api_m3u_accounts_destroy`  

Delete an M3U account and all auto-created channels attributed
to it. Auto-created channels with no surviving provider have no
useful state (they cannot sync, their streams are about to
cascade away), so the delete is unconditional: the only
question for the user is whether to confirm. Manual channels
are untouched, even if they include streams from this account;
those streams cascade away independently and the channels
survive with their other streams. The legacy
``?cleanup_channels`` query parameter is accepted for backward
compatibility but ignored.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/m3u/accounts/{id}/auto-created-channels-count/`
**Operation ID:** `api_m3u_accounts_auto_created_channels_count_retrieve`  

Preview how many auto-created channels would be removed if the account
were deleted with cleanup_channels=true. The frontend calls this when
the user clicks Delete, to render a truthful confirmation dialog
("Also delete N channels auto-created by this provider?").

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: object |

---
#### `PATCH` `/api/m3u/accounts/{id}/group-settings/`
**Operation ID:** `api_m3u_accounts_group_settings_partial_update`  

Update auto channel sync settings for M3U account groups

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedM3UAccount`](#model-patchedm3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedM3UAccount`](#model-patchedm3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedM3UAccount`](#model-patchedm3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccount](#model-m3uaccount) |

---
#### `POST` `/api/m3u/accounts/{id}/refresh-vod/`
**Operation ID:** `api_m3u_accounts_refresh_vod_create`  

Trigger VOD content refresh for XtreamCodes accounts

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [M3UAccount](#model-m3uaccount) |

---
#### `POST` `/api/m3u/accounts/{id}/repack-group/`
**Operation ID:** `api_m3u_accounts_repack_group_create`  

Manually re-pack visible channels in one of this account's
groups into the group's [start, end] range. Override-pinned
numbers are treated as reservations and skipped. Hidden channels
without overrides have their channel_number set to NULL.

Useful when the user has just finished customizing channels
(setting overrides as pins, hiding unwanted streams) and wants
the result reflected immediately rather than on the next M3U
refresh. Also acts as a one-shot cleanup for groups that aren't
running in compact mode but have accumulated gaps.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_group_id` | `query` | integer | Yes | ID of the ChannelGroup whose auto-created channels should be repacked. |
| `id` | `path` | integer | Yes | A unique integer value identifying this m3u account. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`M3UAccount`](#model-m3uaccount)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: object |

---
#### `POST` `/api/m3u/refresh/`
**Operation ID:** `api_m3u_refresh_create`  

Triggers a refresh of all active M3U accounts

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/m3u/refresh-account-info/{profile_id}/`
**Operation ID:** `api_m3u_refresh_account_info_create`  

Triggers a refresh of account information for a specific M3U profile

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/m3u/refresh/{account_id}/`
**Operation ID:** `api_m3u_refresh_create_2`  

Triggers a refresh of a single M3U account

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `account_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/m3u/server-groups/`
**Operation ID:** `api_m3u_server_groups_list`  

Handles CRUD operations for Server Groups

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [ServerGroup](#model-servergroup) |

---
#### `POST` `/api/m3u/server-groups/`
**Operation ID:** `api_m3u_server_groups_create`  

Handles CRUD operations for Server Groups

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ServerGroup`](#model-servergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ServerGroup`](#model-servergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ServerGroup`](#model-servergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [ServerGroup](#model-servergroup) |

---
#### `GET` `/api/m3u/server-groups/{id}/`
**Operation ID:** `api_m3u_server_groups_retrieve`  

Handles CRUD operations for Server Groups

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this server group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ServerGroup](#model-servergroup) |

---
#### `PUT` `/api/m3u/server-groups/{id}/`
**Operation ID:** `api_m3u_server_groups_update`  

Handles CRUD operations for Server Groups

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this server group. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`ServerGroup`](#model-servergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`ServerGroup`](#model-servergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`ServerGroup`](#model-servergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ServerGroup](#model-servergroup) |

---
#### `PATCH` `/api/m3u/server-groups/{id}/`
**Operation ID:** `api_m3u_server_groups_partial_update`  

Handles CRUD operations for Server Groups

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this server group. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedServerGroup`](#model-patchedservergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this server group. |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedServerGroup`](#model-patchedservergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this server group. |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedServerGroup`](#model-patchedservergroup)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this server group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [ServerGroup](#model-servergroup) |

---
#### `DELETE` `/api/m3u/server-groups/{id}/`
**Operation ID:** `api_m3u_server_groups_destroy`  

Handles CRUD operations for Server Groups

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this server group. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
### VOD (Video on Demand)
Total Endpoints: **24**

#### `GET` `/api/vod/all/`
**Operation ID:** `api_vod_all_list`  

Override list to handle unified content properly - database-level approach

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedMovieList](#model-paginatedmovielist) |

---
#### `GET` `/api/vod/all/{id}/`
**Operation ID:** `api_vod_all_retrieve`  

ViewSet that combines Movies and Series for unified 'All' view

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Movie. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Movie](#model-movie) |

---
#### `GET` `/api/vod/categories/`
**Operation ID:** `api_vod_categories_list`  

Override list to ensure Uncategorized categories and relations exist for all XC accounts with VOD enabled

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `category_type` | `query` | string | No | Type of content this category contains<br><br>* `movie` - Movie<br>* `series` - Series |
| `m3u_account` | `query` | number | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `search` | `query` | string | No | A search term. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [VODCategory](#model-vodcategory) |

---
#### `GET` `/api/vod/categories/{id}/`
**Operation ID:** `api_vod_categories_retrieve`  

ViewSet for VOD Categories

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this VOD Category. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [VODCategory](#model-vodcategory) |

---
#### `GET` `/api/vod/episodes/`
**Operation ID:** `api_vod_episodes_list`  

ViewSet for Episode content

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `episode_number` | `query` | integer | No |  |
| `m3u_account` | `query` | number | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |
| `season_number` | `query` | integer | No |  |
| `series` | `query` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedEpisodeList](#model-paginatedepisodelist) |

---
#### `GET` `/api/vod/episodes/{id}/`
**Operation ID:** `api_vod_episodes_retrieve`  

ViewSet for Episode content

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Episode. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Episode](#model-episode) |

---
#### `GET` `/api/vod/movies/`
**Operation ID:** `api_vod_movies_list`  

ViewSet for Movie content

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `category` | `query` | string | No |  |
| `m3u_account` | `query` | integer | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |
| `year` | `query` | integer | No |  |
| `year_gte` | `query` | integer | No |  |
| `year_lte` | `query` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedMovieList](#model-paginatedmovielist) |

---
#### `GET` `/api/vod/movies/{id}/`
**Operation ID:** `api_vod_movies_retrieve`  

ViewSet for Movie content

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Movie. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Movie](#model-movie) |

---
#### `GET` `/api/vod/movies/{id}/provider-info/`
**Operation ID:** `api_vod_movies_provider_info_retrieve`  

Get detailed movie information from the original provider, throttled to 24h.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Movie. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Movie](#model-movie) |

---
#### `GET` `/api/vod/movies/{id}/providers/`
**Operation ID:** `api_vod_movies_providers_retrieve`  

Get all providers (M3U accounts) that have this movie

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Movie. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Movie](#model-movie) |

---
#### `GET` `/api/vod/series/`
**Operation ID:** `api_vod_series_list`  

ViewSet for Series management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `category` | `query` | string | No |  |
| `m3u_account` | `query` | integer | No |  |
| `name` | `query` | string | No |  |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |
| `year` | `query` | integer | No |  |
| `year_gte` | `query` | integer | No |  |
| `year_lte` | `query` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedSeriesList](#model-paginatedserieslist) |

---
#### `GET` `/api/vod/series/{id}/`
**Operation ID:** `api_vod_series_retrieve`  

ViewSet for Series management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Series. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Series](#model-series) |

---
#### `GET` `/api/vod/series/{id}/episodes/`
**Operation ID:** `api_vod_series_episodes_retrieve`  

Get episodes for this series with provider information

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Series. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Series](#model-series) |

---
#### `GET` `/api/vod/series/{id}/provider-info/`
**Operation ID:** `api_vod_series_provider_info_retrieve`  

Get detailed series information, refreshing from provider if needed

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Series. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Series](#model-series) |

---
#### `GET` `/api/vod/series/{id}/providers/`
**Operation ID:** `api_vod_series_providers_retrieve`  

Get all providers (M3U accounts) that have this series

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this Series. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Series](#model-series) |

---
#### `GET` `/api/vod/vodlogos/`
**Operation ID:** `api_vod_vodlogos_list`  

ViewSet for VOD Logo management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `ordering` | `query` | string | No | Which field to use when ordering the results. |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |
| `search` | `query` | string | No | A search term. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedVODLogoList](#model-paginatedvodlogolist) |

---
#### `POST` `/api/vod/vodlogos/`
**Operation ID:** `api_vod_vodlogos_create`  

ViewSet for VOD Logo management

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [VODLogo](#model-vodlogo) |

---
#### `GET` `/api/vod/vodlogos/{id}/`
**Operation ID:** `api_vod_vodlogos_retrieve`  

ViewSet for VOD Logo management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this VOD Logo. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [VODLogo](#model-vodlogo) |

---
#### `PUT` `/api/vod/vodlogos/{id}/`
**Operation ID:** `api_vod_vodlogos_update`  

ViewSet for VOD Logo management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this VOD Logo. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [VODLogo](#model-vodlogo) |

---
#### `PATCH` `/api/vod/vodlogos/{id}/`
**Operation ID:** `api_vod_vodlogos_partial_update`  

ViewSet for VOD Logo management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this VOD Logo. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedVODLogo`](#model-patchedvodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `movie_count` | string | No |  |
| `series_count` | string | No |  |
| `is_used` | string | No |  |
| `item_names` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedVODLogo`](#model-patchedvodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `movie_count` | string | No |  |
| `series_count` | string | No |  |
| `is_used` | string | No |  |
| `item_names` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedVODLogo`](#model-patchedvodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `movie_count` | string | No |  |
| `series_count` | string | No |  |
| `is_used` | string | No |  |
| `item_names` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [VODLogo](#model-vodlogo) |

---
#### `DELETE` `/api/vod/vodlogos/{id}/`
**Operation ID:** `api_vod_vodlogos_destroy`  

ViewSet for VOD Logo management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this VOD Logo. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/vod/vodlogos/{id}/cache/`
**Operation ID:** `api_vod_vodlogos_cache_retrieve`  

Streams the VOD logo file, whether it's local or remote.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this VOD Logo. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [VODLogo](#model-vodlogo) |

---
#### `DELETE` `/api/vod/vodlogos/bulk-delete/`
**Operation ID:** `api_vod_vodlogos_bulk_delete_destroy`  

Delete multiple VOD logos at once

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/vod/vodlogos/cleanup/`
**Operation ID:** `api_vod_vodlogos_cleanup_create`  

Delete all VOD logos that are not used by any movies or series

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`VODLogo`](#model-vodlogo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [VODLogo](#model-vodlogo) |

---
### Streaming & Proxy Engine
Total Endpoints: **19**

#### `GET` `/{username}/{password}/{channel_id}`
**Operation ID:** `root_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |
| `password` | `path` | string | Yes |  |
| `username` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/live/{username}/{password}/{channel_id}`
**Operation ID:** `live_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |
| `password` | `path` | string | Yes |  |
| `username` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/movie/{username}/{password}/{stream_id}.{extension}`
**Operation ID:** `movie_._retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `extension` | `path` | string | Yes |  |
| `password` | `path` | string | Yes |  |
| `stream_id` | `path` | string | Yes |  |
| `username` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/proxy/hls/change_stream/{channel_id}`
**Operation ID:** `proxy_hls_change_stream_create`  

Change stream URL for existing channel

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/proxy/ts/change_stream/{channel_id}`
**Operation ID:** `proxy_ts_change_stream_create`  

Change stream URL for existing channel with enhanced diagnostics

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/proxy/ts/next_stream/{channel_id}`
**Operation ID:** `proxy_ts_next_stream_create`  

Switch to the next available stream for a channel

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/ts/status`
**Operation ID:** `proxy_ts_status_retrieve`  

Returns status information about channels with detail level based on request:
- /status/ returns basic summary of all channels
- /status/{channel_id} returns detailed info about specific channel

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/ts/status/{channel_id}`
**Operation ID:** `proxy_ts_status_retrieve_2`  

Returns status information about channels with detail level based on request:
- /status/ returns basic summary of all channels
- /status/{channel_id} returns detailed info about specific channel

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/proxy/ts/stop/{channel_id}`
**Operation ID:** `proxy_ts_stop_create`  

Stop a channel and release all associated resources using PubSub events

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `DELETE` `/proxy/ts/stop/{channel_id}`
**Operation ID:** `proxy_ts_stop_destroy`  

Stop a channel and release all associated resources using PubSub events

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/proxy/ts/stop_client/{channel_id}`
**Operation ID:** `proxy_ts_stop_client_create`  

Stop a specific client connection using existing client management

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/ts/stream/{channel_id}`
**Operation ID:** `proxy_ts_stream_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/vod/{content_type}/{content_id}`
**Operation ID:** `proxy_vod_retrieve`  

Stream VOD content (movies or series episodes) with session-based connection reuse

Args:
    content_type: 'movie', 'series', or 'episode'
    content_id: ID of the content
    session_id: Optional session ID from URL path (for persistent connections)
    profile_id: Optional M3U profile ID for authentication

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `content_id` | `path` | string (uuid) | Yes |  |
| `content_type` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/vod/{content_type}/{content_id}/{profile_id}/`
**Operation ID:** `proxy_vod_retrieve_2`  

Stream VOD content (movies or series episodes) with session-based connection reuse

Args:
    content_type: 'movie', 'series', or 'episode'
    content_id: ID of the content
    session_id: Optional session ID from URL path (for persistent connections)
    profile_id: Optional M3U profile ID for authentication

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `content_id` | `path` | string (uuid) | Yes |  |
| `content_type` | `path` | string | Yes |  |
| `profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/vod/{content_type}/{content_id}/{session_id}`
**Operation ID:** `proxy_vod_retrieve_3`  

Stream VOD content (movies or series episodes) with session-based connection reuse

Args:
    content_type: 'movie', 'series', or 'episode'
    content_id: ID of the content
    session_id: Optional session ID from URL path (for persistent connections)
    profile_id: Optional M3U profile ID for authentication

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `content_id` | `path` | string (uuid) | Yes |  |
| `content_type` | `path` | string | Yes |  |
| `session_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/vod/{content_type}/{content_id}/{session_id}/{profile_id}/`
**Operation ID:** `proxy_vod_retrieve_4`  

Stream VOD content (movies or series episodes) with session-based connection reuse

Args:
    content_type: 'movie', 'series', or 'episode'
    content_id: ID of the content
    session_id: Optional session ID from URL path (for persistent connections)
    profile_id: Optional M3U profile ID for authentication

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `content_id` | `path` | string (uuid) | Yes |  |
| `content_type` | `path` | string | Yes |  |
| `profile_id` | `path` | integer | Yes |  |
| `session_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/proxy/vod/stats/`
**Operation ID:** `proxy_vod_stats_retrieve`  

Get current VOD connection statistics

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/proxy/vod/stop_client/`
**Operation ID:** `proxy_vod_stop_client_create`  

Stop a specific VOD client connection using stop signal mechanism

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/series/{username}/{password}/{stream_id}.{extension}`
**Operation ID:** `series_._retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `extension` | `path` | string | Yes |  |
| `password` | `path` | string | Yes |  |
| `stream_id` | `path` | string | Yes |  |
| `username` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
### HDHomeRun Emulation
Total Endpoints: **29**

#### `GET` `/api/hdhr/device.xml`
**Operation ID:** `api_hdhr_device.xml_retrieve`  

Retrieve the HDHomeRun device XML configuration

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/hdhr/devices/`
**Operation ID:** `api_hdhr_devices_list`  

Handles CRUD operations for HDHomeRun devices

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [HDHRDevice](#model-hdhrdevice) |

---
#### `POST` `/api/hdhr/devices/`
**Operation ID:** `api_hdhr_devices_create`  

Handles CRUD operations for HDHomeRun devices

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `GET` `/api/hdhr/devices/{id}/`
**Operation ID:** `api_hdhr_devices_retrieve`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `PUT` `/api/hdhr/devices/{id}/`
**Operation ID:** `api_hdhr_devices_update`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `PATCH` `/api/hdhr/devices/{id}/`
**Operation ID:** `api_hdhr_devices_partial_update`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedHDHRDevice`](#model-patchedhdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedHDHRDevice`](#model-patchedhdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedHDHRDevice`](#model-patchedhdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `DELETE` `/api/hdhr/devices/{id}/`
**Operation ID:** `api_hdhr_devices_destroy`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/hdhr/discover.json`
**Operation ID:** `api_hdhr_discover.json_retrieve`  

Retrieve HDHomeRun device discovery information

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/hdhr/lineup.json`
**Operation ID:** `api_hdhr_lineup.json_retrieve`  

Retrieve the available channel lineup

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/hdhr/lineup_status.json`
**Operation ID:** `api_hdhr_lineup_status.json_retrieve`  

Retrieve the HDHomeRun lineup status

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/{channel_profile}/discover.json`
**Operation ID:** `hdhr_discover.json_retrieve_2`  

Retrieve HDHomeRun device discovery information

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_profile` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/{channel_profile}/lineup.json`
**Operation ID:** `hdhr_lineup.json_retrieve_2`  

Retrieve the available channel lineup

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_profile` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/{channel_profile}/lineup_status.json`
**Operation ID:** `hdhr_lineup_status.json_retrieve_2`  

Retrieve the HDHomeRun lineup status

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_profile` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/{channel_profile}/output_profile/{output_profile_id}/discover.json`
**Operation ID:** `hdhr_output_profile_discover.json_retrieve_2`  

Retrieve HDHomeRun device discovery information

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_profile` | `path` | string | Yes |  |
| `output_profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/{channel_profile}/output_profile/{output_profile_id}/lineup.json`
**Operation ID:** `hdhr_output_profile_lineup.json_retrieve_2`  

Retrieve the available channel lineup

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_profile` | `path` | string | Yes |  |
| `output_profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/{channel_profile}/output_profile/{output_profile_id}/lineup_status.json`
**Operation ID:** `hdhr_output_profile_lineup_status.json_retrieve_2`  

Retrieve the HDHomeRun lineup status

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `channel_profile` | `path` | string | Yes |  |
| `output_profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/device.xml`
**Operation ID:** `hdhr_device.xml_retrieve`  

Retrieve the HDHomeRun device XML configuration

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/devices/`
**Operation ID:** `hdhr_devices_list`  

Handles CRUD operations for HDHomeRun devices

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [HDHRDevice](#model-hdhrdevice) |

---
#### `POST` `/hdhr/devices/`
**Operation ID:** `hdhr_devices_create`  

Handles CRUD operations for HDHomeRun devices

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `GET` `/hdhr/devices/{id}/`
**Operation ID:** `hdhr_devices_retrieve`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `PUT` `/hdhr/devices/{id}/`
**Operation ID:** `hdhr_devices_update`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`HDHRDevice`](#model-hdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `PATCH` `/hdhr/devices/{id}/`
**Operation ID:** `hdhr_devices_partial_update`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedHDHRDevice`](#model-patchedhdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedHDHRDevice`](#model-patchedhdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedHDHRDevice`](#model-patchedhdhrdevice)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [HDHRDevice](#model-hdhrdevice) |

---
#### `DELETE` `/hdhr/devices/{id}/`
**Operation ID:** `hdhr_devices_destroy`  

Handles CRUD operations for HDHomeRun devices

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this hdhr device. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/hdhr/discover.json`
**Operation ID:** `hdhr_discover.json_retrieve`  

Retrieve HDHomeRun device discovery information

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/lineup.json`
**Operation ID:** `hdhr_lineup.json_retrieve`  

Retrieve the available channel lineup

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/lineup_status.json`
**Operation ID:** `hdhr_lineup_status.json_retrieve`  

Retrieve the HDHomeRun lineup status

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/output_profile/{output_profile_id}/discover.json`
**Operation ID:** `hdhr_output_profile_discover.json_retrieve`  

Retrieve HDHomeRun device discovery information

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `output_profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/output_profile/{output_profile_id}/lineup.json`
**Operation ID:** `hdhr_output_profile_lineup.json_retrieve`  

Retrieve the available channel lineup

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `output_profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/hdhr/output_profile/{output_profile_id}/lineup_status.json`
**Operation ID:** `hdhr_output_profile_lineup_status.json_retrieve`  

Retrieve the HDHomeRun lineup status

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `output_profile_id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
### Backups
Total Endpoints: **10**

#### `GET` `/api/backups/`
**Operation ID:** `api_backups_retrieve`  

List all available backup files.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `DELETE` `/api/backups/{filename}/delete/`
**Operation ID:** `api_backups_delete_destroy`  

Delete a backup file.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `filename` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/backups/{filename}/download/`
**Operation ID:** `api_backups_download_retrieve`  

Download a backup file.

Requires either:
- Valid admin authentication, OR
- Valid download_token query parameter

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `filename` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/backups/{filename}/download-token/`
**Operation ID:** `api_backups_download_token_retrieve`  

Get a signed token for downloading a backup file.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `filename` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/backups/{filename}/restore/`
**Operation ID:** `api_backups_restore_create`  

Restore from a backup file (async via Celery). WARNING: This will flush the database!

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `filename` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/backups/create/`
**Operation ID:** `api_backups_create_create`  

Create a new backup (async via Celery).

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/backups/schedule/`
**Operation ID:** `api_backups_schedule_retrieve`  

Get backup schedule settings.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `PUT` `/api/backups/schedule/update/`
**Operation ID:** `api_backups_schedule_update_update`  

Update backup schedule settings.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/backups/status/{task_id}/`
**Operation ID:** `api_backups_status_retrieve`  

Check the status of a backup/restore task.

Requires either:
- Valid admin authentication, OR
- Valid task_token query parameter

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `task_id` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/backups/upload/`
**Operation ID:** `api_backups_upload_create`  

Upload a backup file for restoration.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
### Integrations & Subscriptions
Total Endpoints: **17**

#### `GET` `/api/connect/integrations/`
**Operation ID:** `api_connect_integrations_list`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [Integration](#model-integration) |

---
#### `POST` `/api/connect/integrations/`
**Operation ID:** `api_connect_integrations_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [Integration](#model-integration) |

---
#### `GET` `/api/connect/integrations/{id}/`
**Operation ID:** `api_connect_integrations_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Integration](#model-integration) |

---
#### `PUT` `/api/connect/integrations/{id}/`
**Operation ID:** `api_connect_integrations_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Integration](#model-integration) |

---
#### `PATCH` `/api/connect/integrations/{id}/`
**Operation ID:** `api_connect_integrations_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedIntegration`](#model-patchedintegration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `type` | [TypeEnum](#model-typeenum) | No | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | No |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedIntegration`](#model-patchedintegration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `type` | [TypeEnum](#model-typeenum) | No | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | No |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedIntegration`](#model-patchedintegration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `type` | [TypeEnum](#model-typeenum) | No | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | No |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Integration](#model-integration) |

---
#### `DELETE` `/api/connect/integrations/{id}/`
**Operation ID:** `api_connect_integrations_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/connect/integrations/{id}/subscriptions/`
**Operation ID:** `api_connect_integrations_subscriptions_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Integration](#model-integration) |

---
#### `PUT` `/api/connect/integrations/{id}/subscriptions/set/`
**Operation ID:** `api_connect_integrations_subscriptions_set_update`  

Replace the integration's event subscriptions with the provided list. Accepts a JSON array of subscription objects. Existing subscriptions not in the list will be deleted. The 'payload_template' field is only relevant for webhook integrations.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
- **Content-Type:** `application/x-www-form-urlencoded`
- **Content-Type:** `multipart/form-data`

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [SetSubscriptionsResponse](#model-setsubscriptionsresponse) |

---
#### `POST` `/api/connect/integrations/{id}/test/`
**Operation ID:** `api_connect_integrations_test_create`  

Execute a saved integration (connect) with a dummy payload to verify configuration.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this integration. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`Integration`](#model-integration)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [Integration](#model-integration) |

---
#### `GET` `/api/connect/logs/`
**Operation ID:** `api_connect_logs_list`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `page` | `query` | integer | No | A page number within the paginated result set. |
| `page_size` | `query` | integer | No | Number of results to return per page. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PaginatedDeliveryLogList](#model-paginateddeliveryloglist) |

---
#### `GET` `/api/connect/logs/{id}/`
**Operation ID:** `api_connect_logs_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this delivery log. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [DeliveryLog](#model-deliverylog) |

---
#### `GET` `/api/connect/subscriptions/`
**Operation ID:** `api_connect_subscriptions_list`  
**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [EventSubscription](#model-eventsubscription) |

---
#### `POST` `/api/connect/subscriptions/`
**Operation ID:** `api_connect_subscriptions_create`  
**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EventSubscription`](#model-eventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EventSubscription`](#model-eventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EventSubscription`](#model-eventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [EventSubscription](#model-eventsubscription) |

---
#### `GET` `/api/connect/subscriptions/{id}/`
**Operation ID:** `api_connect_subscriptions_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this event subscription. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EventSubscription](#model-eventsubscription) |

---
#### `PUT` `/api/connect/subscriptions/{id}/`
**Operation ID:** `api_connect_subscriptions_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this event subscription. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`EventSubscription`](#model-eventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`EventSubscription`](#model-eventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`EventSubscription`](#model-eventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EventSubscription](#model-eventsubscription) |

---
#### `PATCH` `/api/connect/subscriptions/{id}/`
**Operation ID:** `api_connect_subscriptions_partial_update`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this event subscription. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedEventSubscription`](#model-patchedeventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `event` | [EventEnum](#model-eventenum) | No | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedEventSubscription`](#model-patchedeventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `event` | [EventEnum](#model-eventenum) | No | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedEventSubscription`](#model-patchedeventsubscription)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `event` | [EventEnum](#model-eventenum) | No | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [EventSubscription](#model-eventsubscription) |

---
#### `DELETE` `/api/connect/subscriptions/{id}/`
**Operation ID:** `api_connect_subscriptions_destroy`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this event subscription. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
### Plugins & Repositories
Total Endpoints: **19**

#### `GET` `/api/plugins/plugins/`
**Operation ID:** `api_plugins_plugins_retrieve`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `DELETE` `/api/plugins/plugins/{key}/delete/`
**Operation ID:** `api_plugins_plugins_delete_destroy`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `key` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/plugins/plugins/{key}/enabled/`
**Operation ID:** `api_plugins_plugins_enabled_create`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `key` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/plugins/plugins/{key}/logo/`
**Operation ID:** `api_plugins_plugins_logo_retrieve`  
**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `key` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/plugins/plugins/{key}/run/`
**Operation ID:** `api_plugins_plugins_run_create`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `key` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/plugins/plugins/{key}/settings/`
**Operation ID:** `api_plugins_plugins_settings_create`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `key` | `path` | string | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/plugins/plugins/import/`
**Operation ID:** `api_plugins_plugins_import_create`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `POST` `/api/plugins/plugins/reload/`
**Operation ID:** `api_plugins_plugins_reload_create`  

Mixin that routes permission resolution through permission_classes_by_method,
falling back to Authenticated() for any method not explicitly listed.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/plugins/repos/`
**Operation ID:** `api_plugins_repos_list`  

List all plugin repositories.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [PluginRepo](#model-pluginrepo) |

---
#### `POST` `/api/plugins/repos/`
**Operation ID:** `api_plugins_repos_create`  

Add a new plugin repository by manifest URL. Fetches and validates the manifest immediately.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`PluginRepo`](#model-pluginrepo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PluginRepo`](#model-pluginrepo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PluginRepo`](#model-pluginrepo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [PluginRepo](#model-pluginrepo) |
| `400` |  | `application/json`: [RepoAddError](#model-repoadderror) |

---
#### `PUT` `/api/plugins/repos/{id}/`
**Operation ID:** `api_plugins_repos_update`  

Update a plugin repository (e.g. public key).

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes |  |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`PluginRepo`](#model-pluginrepo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PluginRepo`](#model-pluginrepo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PluginRepo`](#model-pluginrepo)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PluginRepo](#model-pluginrepo) |
| `404` |  | `application/json`: [RepoNotFound](#model-reponotfound) |

---
#### `DELETE` `/api/plugins/repos/{id}/`
**Operation ID:** `api_plugins_repos_destroy`  

Remove a plugin repository.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [RepoDeleteSuccess](#model-repodeletesuccess) |
| `404` |  | `application/json`: [RepoDeleteNotFound](#model-repodeletenotfound) |

---
#### `POST` `/api/plugins/repos/{id}/refresh/`
**Operation ID:** `api_plugins_repos_refresh_create`  

Re-fetch and update the cached manifest for a plugin repository.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PluginRepo](#model-pluginrepo) |
| `404` |  | `application/json`: [RepoRefreshNotFound](#model-reporefreshnotfound) |
| `502` |  | `application/json`: [RepoRefreshError](#model-reporefresherror) |

---
#### `GET` `/api/plugins/repos/available/`
**Operation ID:** `api_plugins_repos_available_retrieve`  

Return the aggregated list of available plugins from all enabled repositories, annotated with installation status.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [AvailablePluginsResponse](#model-availablepluginsresponse) |

---
#### `POST` `/api/plugins/repos/install/`
**Operation ID:** `api_plugins_repos_install_create`  

Download and install a plugin release zip from a managed repository. Verifies SHA256 if provided.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`PluginInstallFromRepoRequest`](#model-plugininstallfromreporequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `slug` | string | Yes |  |
| `version` | string | Yes |  |
| `download_url` | string (uri) | Yes |  |
| `sha256` | string | No |  |
| `min_dispatcharr_version` | string | No |  |
| `max_dispatcharr_version` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PluginInstallFromRepoRequest`](#model-plugininstallfromreporequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `slug` | string | Yes |  |
| `version` | string | Yes |  |
| `download_url` | string (uri) | Yes |  |
| `sha256` | string | No |  |
| `min_dispatcharr_version` | string | No |  |
| `max_dispatcharr_version` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PluginInstallFromRepoRequest`](#model-plugininstallfromreporequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `slug` | string | Yes |  |
| `version` | string | Yes |  |
| `download_url` | string (uri) | Yes |  |
| `sha256` | string | No |  |
| `min_dispatcharr_version` | string | No |  |
| `max_dispatcharr_version` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PluginInstallFromRepoResponse](#model-plugininstallfromreporesponse) |
| `201` |  | `application/json`: [PluginInstallFromRepoCreated](#model-plugininstallfromrepocreated) |
| `400` |  | `application/json`: [PluginInstallFromRepoError](#model-plugininstallfromrepoerror) |

---
#### `POST` `/api/plugins/repos/plugin-detail/`
**Operation ID:** `api_plugins_repos_plugin_detail_create`  

Fetch and GPG-verify a per-plugin manifest from a repo, resolving relative URLs against the repo root.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`PluginDetailManifestRequest`](#model-plugindetailmanifestrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `manifest_url` | string (uri) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PluginDetailManifestRequest`](#model-plugindetailmanifestrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `manifest_url` | string (uri) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PluginDetailManifestRequest`](#model-plugindetailmanifestrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `manifest_url` | string (uri) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PluginDetailManifestResponse](#model-plugindetailmanifestresponse) |
| `502` |  | `application/json`: [PluginDetailManifestError](#model-plugindetailmanifesterror) |

---
#### `POST` `/api/plugins/repos/preview/`
**Operation ID:** `api_plugins_repos_preview_create`  

Preview a manifest URL: fetch and validate without saving. Returns validity, repo name, signature status, and plugin count.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`RepoPreviewRequest`](#model-repopreviewrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string (uri) | Yes |  |
| `public_key` | string | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`RepoPreviewRequest`](#model-repopreviewrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string (uri) | Yes |  |
| `public_key` | string | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`RepoPreviewRequest`](#model-repopreviewrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string (uri) | Yes |  |
| `public_key` | string | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [RepoPreviewResponse](#model-repopreviewresponse) |

---
#### `GET` `/api/plugins/repos/settings/`
**Operation ID:** `api_plugins_repos_settings_retrieve`  

Get the plugin repository refresh interval setting.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PluginRepoSettingsResponse](#model-pluginreposettingsresponse) |

---
#### `PUT` `/api/plugins/repos/settings/`
**Operation ID:** `api_plugins_repos_settings_update`  

Update the plugin repository refresh interval (hours). Set to 0 to disable automatic refresh.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`PluginRepoSettingsRequest`](#model-pluginreposettingsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_interval_hours` | integer | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PluginRepoSettingsRequest`](#model-pluginreposettingsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_interval_hours` | integer | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PluginRepoSettingsRequest`](#model-pluginreposettingsrequest)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_interval_hours` | integer | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [PluginRepoSettingsUpdated](#model-pluginreposettingsupdated) |

---
### Core System & Settings
Total Endpoints: **39**

#### `GET` `/api/core/notifications/`
**Operation ID:** `api_core_notifications_list`  

List all active notifications for the current user.
Optionally filter by dismissed status.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [SystemNotification](#model-systemnotification) |

---
#### `POST` `/api/core/notifications/`
**Operation ID:** `api_core_notifications_create`  

API endpoint for system notifications.
Users can view active notifications and dismiss them.
Admins can create and manage notifications.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `GET` `/api/core/notifications/{id}/`
**Operation ID:** `api_core_notifications_retrieve`  

API endpoint for system notifications.
Users can view active notifications and dismiss them.
Admins can create and manage notifications.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this system notification. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `PUT` `/api/core/notifications/{id}/`
**Operation ID:** `api_core_notifications_update`  

API endpoint for system notifications.
Users can view active notifications and dismiss them.
Admins can create and manage notifications.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this system notification. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `PATCH` `/api/core/notifications/{id}/`
**Operation ID:** `api_core_notifications_partial_update`  

API endpoint for system notifications.
Users can view active notifications and dismiss them.
Admins can create and manage notifications.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this system notification. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedSystemNotification`](#model-patchedsystemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `notification_key` | string | No |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | No |  |
| `message` | string | No |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | No |  |
| `is_dismissed` | string | No |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedSystemNotification`](#model-patchedsystemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `notification_key` | string | No |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | No |  |
| `message` | string | No |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | No |  |
| `is_dismissed` | string | No |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedSystemNotification`](#model-patchedsystemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `notification_key` | string | No |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | No |  |
| `message` | string | No |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | No |  |
| `is_dismissed` | string | No |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `DELETE` `/api/core/notifications/{id}/`
**Operation ID:** `api_core_notifications_destroy`  

API endpoint for system notifications.
Users can view active notifications and dismiss them.
Admins can create and manage notifications.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this system notification. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/core/notifications/{id}/dismiss/`
**Operation ID:** `api_core_notifications_dismiss_create`  

Dismiss a notification for the current user.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this system notification. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `GET` `/api/core/notifications/count/`
**Operation ID:** `api_core_notifications_count_retrieve`  

Get count of unread notifications.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `POST` `/api/core/notifications/dismiss-all/`
**Operation ID:** `api_core_notifications_dismiss_all_create`  

Dismiss all notifications for the current user.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`SystemNotification`](#model-systemnotification)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [SystemNotification](#model-systemnotification) |

---
#### `GET` `/api/core/outputprofiles/`
**Operation ID:** `api_core_outputprofiles_list`  

API endpoint that allows output profiles to be viewed, created, edited, or deleted.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [OutputProfile](#model-outputprofile) |

---
#### `POST` `/api/core/outputprofiles/`
**Operation ID:** `api_core_outputprofiles_create`  

API endpoint that allows output profiles to be viewed, created, edited, or deleted.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`OutputProfile`](#model-outputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`OutputProfile`](#model-outputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`OutputProfile`](#model-outputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [OutputProfile](#model-outputprofile) |

---
#### `GET` `/api/core/outputprofiles/{id}/`
**Operation ID:** `api_core_outputprofiles_retrieve`  

API endpoint that allows output profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this output profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [OutputProfile](#model-outputprofile) |

---
#### `PUT` `/api/core/outputprofiles/{id}/`
**Operation ID:** `api_core_outputprofiles_update`  

API endpoint that allows output profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this output profile. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`OutputProfile`](#model-outputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`OutputProfile`](#model-outputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`OutputProfile`](#model-outputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [OutputProfile](#model-outputprofile) |

---
#### `PATCH` `/api/core/outputprofiles/{id}/`
**Operation ID:** `api_core_outputprofiles_partial_update`  

API endpoint that allows output profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this output profile. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedOutputProfile`](#model-patchedoutputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Display name for this output profile |
| `command` | string | No | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | No | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedOutputProfile`](#model-patchedoutputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Display name for this output profile |
| `command` | string | No | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | No | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedOutputProfile`](#model-patchedoutputprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Display name for this output profile |
| `command` | string | No | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | No | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [OutputProfile](#model-outputprofile) |

---
#### `DELETE` `/api/core/outputprofiles/{id}/`
**Operation ID:** `api_core_outputprofiles_destroy`  

API endpoint that allows output profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this output profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/core/rehash-streams/`
**Operation ID:** `api_core_rehash_streams_create`  

Trigger rehashing of all streams

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/core/settings/`
**Operation ID:** `api_core_settings_list`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [CoreSettings](#model-coresettings) |

---
#### `POST` `/api/core/settings/`
**Operation ID:** `api_core_settings_create`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [CoreSettings](#model-coresettings) |

---
#### `GET` `/api/core/settings/{id}/`
**Operation ID:** `api_core_settings_retrieve`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this core settings. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [CoreSettings](#model-coresettings) |

---
#### `PUT` `/api/core/settings/{id}/`
**Operation ID:** `api_core_settings_update`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this core settings. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [CoreSettings](#model-coresettings) |

---
#### `PATCH` `/api/core/settings/{id}/`
**Operation ID:** `api_core_settings_partial_update`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this core settings. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedCoreSettings`](#model-patchedcoresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `key` | string | No |  |
| `name` | string | No |  |
| `value` | any | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedCoreSettings`](#model-patchedcoresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `key` | string | No |  |
| `name` | string | No |  |
| `value` | any | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedCoreSettings`](#model-patchedcoresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `key` | string | No |  |
| `name` | string | No |  |
| `value` | any | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [CoreSettings](#model-coresettings) |

---
#### `DELETE` `/api/core/settings/{id}/`
**Operation ID:** `api_core_settings_destroy`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this core settings. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `POST` `/api/core/settings/check/`
**Operation ID:** `api_core_settings_check_create`  

API endpoint for editing core settings.
This is treated as a singleton: only one instance should exist.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`CoreSettings`](#model-coresettings)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [CoreSettings](#model-coresettings) |

---
#### `GET` `/api/core/settings/env/`
**Operation ID:** `api_core_settings_env_retrieve`  

Endpoint for environment details

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/core/streamprofiles/`
**Operation ID:** `api_core_streamprofiles_list`  

API endpoint that allows stream profiles to be viewed, created, edited, or deleted.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [StreamProfile](#model-streamprofile) |

---
#### `POST` `/api/core/streamprofiles/`
**Operation ID:** `api_core_streamprofiles_create`  

API endpoint that allows stream profiles to be viewed, created, edited, or deleted.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`StreamProfile`](#model-streamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`StreamProfile`](#model-streamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`StreamProfile`](#model-streamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [StreamProfile](#model-streamprofile) |

---
#### `GET` `/api/core/streamprofiles/{id}/`
**Operation ID:** `api_core_streamprofiles_retrieve`  

API endpoint that allows stream profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this stream profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [StreamProfile](#model-streamprofile) |

---
#### `PUT` `/api/core/streamprofiles/{id}/`
**Operation ID:** `api_core_streamprofiles_update`  

API endpoint that allows stream profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this stream profile. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`StreamProfile`](#model-streamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`StreamProfile`](#model-streamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`StreamProfile`](#model-streamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [StreamProfile](#model-streamprofile) |

---
#### `PATCH` `/api/core/streamprofiles/{id}/`
**Operation ID:** `api_core_streamprofiles_partial_update`  

API endpoint that allows stream profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this stream profile. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedStreamProfile`](#model-patchedstreamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedStreamProfile`](#model-patchedstreamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedStreamProfile`](#model-patchedstreamprofile)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [StreamProfile](#model-streamprofile) |

---
#### `DELETE` `/api/core/streamprofiles/{id}/`
**Operation ID:** `api_core_streamprofiles_destroy`  

API endpoint that allows stream profiles to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this stream profile. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/core/system-events/`
**Operation ID:** `api_core_system_events_retrieve`  

Get recent system events (channel start/stop, buffering, client connections, etc.)

Query Parameters:
    limit: Number of events to return per page (default: 100, max: 1000)
    offset: Number of events to skip (for pagination, default: 0)
    event_type: Filter by specific event type (optional)

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/core/timezones/`
**Operation ID:** `api_core_timezones_retrieve`  

Get list of all supported timezones

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
#### `GET` `/api/core/useragents/`
**Operation ID:** `api_core_useragents_list`  

API endpoint that allows user agents to be viewed, created, edited, or deleted.

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: Array of [UserAgent](#model-useragent) |

---
#### `POST` `/api/core/useragents/`
**Operation ID:** `api_core_useragents_create`  

API endpoint that allows user agents to be viewed, created, edited, or deleted.

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`UserAgent`](#model-useragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`UserAgent`](#model-useragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`UserAgent`](#model-useragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `201` |  | `application/json`: [UserAgent](#model-useragent) |

---
#### `GET` `/api/core/useragents/{id}/`
**Operation ID:** `api_core_useragents_retrieve`  

API endpoint that allows user agents to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user agent. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [UserAgent](#model-useragent) |

---
#### `PUT` `/api/core/useragents/{id}/`
**Operation ID:** `api_core_useragents_update`  

API endpoint that allows user agents to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user agent. |

**Request Body:**
- **Required:** `True`
- **Content-Type:** `application/json`
  - **Schema:** [`UserAgent`](#model-useragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`UserAgent`](#model-useragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`UserAgent`](#model-useragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [UserAgent](#model-useragent) |

---
#### `PATCH` `/api/core/useragents/{id}/`
**Operation ID:** `api_core_useragents_partial_update`  

API endpoint that allows user agents to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user agent. |

**Request Body:**
- **Required:** `False`
- **Content-Type:** `application/json`
  - **Schema:** [`PatchedUserAgent`](#model-patcheduseragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | The User-Agent name. |
| `user_agent` | string | No | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |
- **Content-Type:** `application/x-www-form-urlencoded`
  - **Schema:** [`PatchedUserAgent`](#model-patcheduseragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | The User-Agent name. |
| `user_agent` | string | No | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |
- **Content-Type:** `multipart/form-data`
  - **Schema:** [`PatchedUserAgent`](#model-patcheduseragent)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | The User-Agent name. |
| `user_agent` | string | No | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` |  | `application/json`: [UserAgent](#model-useragent) |

---
#### `DELETE` `/api/core/useragents/{id}/`
**Operation ID:** `api_core_useragents_destroy`  

API endpoint that allows user agents to be viewed, created, edited, or deleted.

**Parameters:**

| Name | Located In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | `path` | integer | Yes | A unique integer value identifying this user agent. |

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `204` | No response body | No body |

---
#### `GET` `/api/core/version/`
**Operation ID:** `api_core_version_retrieve`  

Get application version information

**Responses:**

| Status Code | Description | Content Schema |
| --- | --- | --- |
| `200` | No response body | No body |

---
## Data Models / Schemas
Total Models Defined: **136**

### <a id="model-accounttypeenum"></a>`AccountTypeEnum`
- **Type:** `string`
- **Description:** * `STD` - Standard
* `XC` - Xtream Codes
- **Enum Values:** `STD`, `XC`

### <a id="model-assignchannelsrequest"></a>`AssignChannelsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `starting_number` | number (double) | No | Starting channel number to assign (can be decimal) |
| `channel_ids` | Array of integer | Yes | Channel IDs to assign |

---
### <a id="model-availablepluginsresponse"></a>`AvailablePluginsResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `plugins` | Array of object | Yes |  |

---
### <a id="model-batchsetepgrequest"></a>`BatchSetEpgRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `associations` | Array of [EpgAssociation](#model-epgassociation) | Yes |  |

---
### <a id="model-bulkregexrenamerequest"></a>`BulkRegexRenameRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | Yes |  |
| `find` | string | Yes |  |
| `replace` | string | No |  |
| `flags` | string | No |  |

---
### <a id="model-bulkremoveseriesrecordingsrequest"></a>`BulkRemoveSeriesRecordingsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | Yes | Channel TVG ID (required) |
| `title` | string | No | Series title - when scope=title, only recordings matching this title are removed |
| `scope` | object | No | title: remove only matching title on channel, channel: remove all future recordings on channel<br><br>* `title` - title<br>* `channel` - channel |

---
### <a id="model-categorytypeenum"></a>`CategoryTypeEnum`
- **Type:** `string`
- **Description:** * `movie` - Movie
* `series` - Series
- **Enum Values:** `movie`, `series`

### <a id="model-channeprofilelmembershipupdate"></a>`ChanneProfilelMembershipUpdate`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_id` | integer | Yes |  |
| `enabled` | boolean | Yes |  |

---
### <a id="model-channel"></a>`Channel`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `channel_number` | number (double) | No |  |
| `name` | string | Yes |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | Yes |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | Yes |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | Yes |  |
| `effective_name` | string | Yes |  |
| `effective_channel_number` | string | Yes |  |
| `effective_channel_group_id` | string | Yes |  |
| `effective_logo_id` | string | Yes |  |
| `effective_tvg_id` | string | Yes |  |
| `effective_tvc_guide_stationid` | string | Yes |  |
| `effective_epg_data_id` | string | Yes |  |
| `effective_stream_profile_id` | string | Yes |  |

---
### <a id="model-channelbulkediterrorresponse"></a>`ChannelBulkEditErrorResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `errors` | Array of object | Yes |  |

---
### <a id="model-channelbulkeditrequest"></a>`ChannelBulkEditRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the channel to update (required). |
| `name` | string | No |  |
| `channel_number` | number (double) | No |  |
| `channel_group_id` | integer | No |  |
| `streams` | Array of integer | No | List of stream IDs to assign to this channel (replaces existing assignments). |
| `stream_profile_id` | integer | No |  |
| `logo_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No |  |

---
### <a id="model-channelbulkeditresponse"></a>`ChannelBulkEditResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `message` | string | Yes |  |
| `channels` | Array of [Channel](#model-channel) | Yes |  |

---
### <a id="model-channelbyuuidsrequest"></a>`ChannelByUUIDsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uuids` | Array of string | Yes | List of channel UUIDs to retrieve |

---
### <a id="model-channelgroup"></a>`ChannelGroup`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `m3u_account_count` | string | Yes |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | Yes |  |

---
### <a id="model-channelgroupm3uaccount"></a>`ChannelGroupM3UAccount`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `m3u_accounts` | integer | Yes |  |
| `channel_group` | integer | Yes |  |
| `enabled` | boolean | Yes |  |
| `auto_channel_sync` | boolean | No |  |
| `auto_sync_channel_start` | number (double) | No |  |
| `auto_sync_channel_end` | number (double) | No |  |
| `custom_properties` | any | No |  |
| `is_stale` | boolean | No | Whether this group relationship is stale (not seen in recent refresh, pending deletion) |
| `last_seen` | string (date-time) | No | Last time this group was seen in the M3U source during a refresh |
| `stream_count` | string | Yes |  |

---
### <a id="model-channeloverride"></a>`ChannelOverride`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No |  |
| `channel_number` | number (double) | No |  |
| `channel_group_id` | integer | No |  |
| `logo_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `stream_profile_id` | integer | No |  |

---
### <a id="model-channelprofile"></a>`ChannelProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `channels` | string | Yes |  |

---
### <a id="model-channelstreamstatsdelta"></a>`ChannelStreamStatsDelta`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `stream_stats` | object | Yes |  |
| `stream_stats_updated_at` | string (date-time) | Yes |  |

---
### <a id="model-channelstreamstatserrorresponse"></a>`ChannelStreamStatsErrorResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `detail` | string | Yes |  |

---
### <a id="model-channelsinrangeresponse"></a>`ChannelsInRangeResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `occupants` | Array of object | Yes |  |

---
### <a id="model-cleanupunusedlogosrequest"></a>`CleanupUnusedLogosRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `delete_files` | boolean | No | Whether to delete local logo files from disk |

---
### <a id="model-coresettings"></a>`CoreSettings`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `key` | string | Yes |  |
| `name` | string | Yes |  |
| `value` | any | No |  |

---
### <a id="model-currentprogramsrequest"></a>`CurrentProgramsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_uuids` | Array of string | No | Array of channel UUIDs. If null or omitted, returns all channels with current programs. |
| `epg_data_ids` | Array of integer | No | Array of EPG data IDs. Can be used instead of channel_ids. |

---
### <a id="model-deliverylog"></a>`DeliveryLog`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `subscription` | object | Yes |  |
| `status` | [DeliveryLogStatusEnum](#model-deliverylogstatusenum) | Yes | Referenced model: `DeliveryLogStatusEnum` |
| `request_payload` | any | No |  |
| `response_payload` | any | No |  |
| `error_message` | string | No |  |
| `created_at` | string (date-time) | Yes |  |

---
### <a id="model-deliverylogstatusenum"></a>`DeliveryLogStatusEnum`
- **Type:** `string`
- **Description:** * `success` - Success
* `failed` - Failed
- **Enum Values:** `success`, `failed`

### <a id="model-descriptionmodeenum"></a>`DescriptionModeEnum`
- **Type:** `string`
- **Description:** * `contains` - contains
* `search` - search
* `regex` - regex
- **Enum Values:** `contains`, `search`, `regex`

### <a id="model-epgdata"></a>`EPGData`
- **Type:** `object`
- **Description:** Only returns the tvg_id and the 'name' field from EPGData.
We assume 'name' is effectively the channel name.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `tvg_id` | string | No |  |
| `name` | string | Yes |  |
| `icon_url` | string (uri) | No |  |
| `epg_source` | integer | No |  |

---
### <a id="model-epgimportrequest"></a>`EPGImportRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the EPG source to refresh. |

---
### <a id="model-epgsource"></a>`EPGSource`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | Yes | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | Yes | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | Yes |  |
| `has_channels` | boolean | Yes |  |

---
### <a id="model-epgsourcestatusenum"></a>`EPGSourceStatusEnum`
- **Type:** `string`
- **Description:** * `idle` - Idle
* `fetching` - Fetching
* `parsing` - Parsing
* `error` - Error
* `success` - Success
* `disabled` - Disabled
- **Enum Values:** `idle`, `fetching`, `parsing`, `error`, `success`, `disabled`

### <a id="model-epgassociation"></a>`EpgAssociation`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_id` | integer | Yes |  |
| `epg_data_id` | integer | No | EPG data ID to link. Pass null to remove EPG linkage. |

---
### <a id="model-episode"></a>`Episode`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `series` | object | Yes |  |
| `uuid` | string (uuid) | Yes |  |
| `name` | string | Yes |  |
| `description` | string | No |  |
| `air_date` | string (date) | No |  |
| `rating` | string | No |  |
| `duration_secs` | integer | No | Duration in seconds |
| `season_number` | integer | No |  |
| `episode_number` | integer | No |  |
| `tmdb_id` | string | No | TMDB ID for metadata |
| `imdb_id` | string | No | IMDB ID for metadata |
| `custom_properties` | object | No | Custom properties for this episode |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

---
### <a id="model-evaluateseriesrulesrequest"></a>`EvaluateSeriesRulesRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional: evaluate only rules for this channel TVG ID. If omitted, all rules are evaluated. |

---
### <a id="model-eventenum"></a>`EventEnum`
- **Type:** `string`
- **Description:** * `channel_start` - Channel Started
* `channel_stop` - Channel Stopped
* `channel_reconnect` - Channel Reconnected
* `channel_error` - Channel Error
* `channel_failover` - Channel Failover
* `stream_switch` - Stream Switch
* `recording_start` - Recording Started
* `recording_end` - Recording Ended
* `epg_refresh` - EPG Refreshed
* `m3u_refresh` - M3U Refreshed
* `client_connect` - Client Connected
* `client_disconnect` - Client Disconnected
* `login_failed` - Login Failed
* `epg_blocked` - EPG Blocked
* `m3u_blocked` - M3U Blocked
* `vod_start` - VOD Started
* `vod_stop` - VOD Stopped
- **Enum Values:** `channel_start`, `channel_stop`, `channel_reconnect`, `channel_error`, `channel_failover`, `stream_switch`, `recording_start`, `recording_end`, `epg_refresh`, `m3u_refresh`, `client_connect`, `client_disconnect`, `login_failed`, `epg_blocked`, `m3u_blocked`, `vod_start`, `vod_stop`

### <a id="model-eventsubscription"></a>`EventSubscription`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `event` | [EventEnum](#model-eventenum) | Yes | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | Yes |  |

---
### <a id="model-filtertypeenum"></a>`FilterTypeEnum`
- **Type:** `string`
- **Description:** * `group` - Group
* `name` - Stream Name
* `url` - Stream URL
- **Enum Values:** `group`, `name`, `url`

### <a id="model-fromstreambulkrequest"></a>`FromStreamBulkRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_ids` | Array of integer | Yes | List of stream IDs to create channels from |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |
| `starting_channel_number` | integer | No | (Optional) Starting channel number mode: null=use provider numbers, 0=lowest available, other=start from specified number |

---
### <a id="model-fromstreamrequest"></a>`FromStreamRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stream_id` | integer | Yes | ID of the stream to link |
| `channel_number` | number (double) | No | (Optional) Desired channel number. Must not be in use. |
| `name` | string | No | Desired channel name |
| `channel_profile_ids` | Array of integer | No | (Optional) Channel profile ID(s). Behavior: omitted = add to ALL profiles (default); empty array [] = add to NO profiles; [0] = add to ALL profiles (explicit); [1,2,...] = add only to specified profiles. |

---
### <a id="model-group"></a>`Group`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `permissions` | Array of integer | Yes |  |

---
### <a id="model-hdhrdevice"></a>`HDHRDevice`
- **Type:** `object`
- **Description:** Serializer for HDHomeRun device information

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `friendly_name` | string | No |  |
| `device_id` | string | Yes |  |
| `tuner_count` | integer | No |  |

---
### <a id="model-integration"></a>`Integration`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `type` | [TypeEnum](#model-typeenum) | Yes | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | Yes |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | Yes |  |

---
### <a id="model-loginrequest"></a>`LoginRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |

---
### <a id="model-logo"></a>`Logo`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `channel_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `channel_names` | string | Yes |  |

---
### <a id="model-m3uaccount"></a>`M3UAccount`
- **Type:** `object`
- **Description:** Serializer for M3U Account

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | Yes | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | Yes |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | Yes |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | Yes |  |
| `all_expirations` | string | Yes |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

---
### <a id="model-m3uaccountprofile"></a>`M3UAccountProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | Yes |  |

---
### <a id="model-m3uaccountstatusenum"></a>`M3UAccountStatusEnum`
- **Type:** `string`
- **Description:** * `idle` - Idle
* `fetching` - Fetching
* `parsing` - Parsing
* `error` - Error
* `success` - Success
* `pending_setup` - Pending Setup
* `disabled` - Disabled
- **Enum Values:** `idle`, `fetching`, `parsing`, `error`, `success`, `pending_setup`, `disabled`

### <a id="model-m3ufilter"></a>`M3UFilter`
- **Type:** `object`
- **Description:** Serializer for M3U Filters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | Yes | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |

---
### <a id="model-m3uvodcategoryrelation"></a>`M3UVODCategoryRelation`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `category` | integer | Yes |  |
| `m3u_account` | integer | Yes |  |
| `enabled` | boolean | No | Set to false to deactivate this category for the M3U account |

---
### <a id="model-matchepgrequest"></a>`MatchEpgRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channel_ids` | Array of integer | No | List of channel IDs to process (includes channels that already have EPG). If empty or not provided, only channels without EPG are processed. |

---
### <a id="model-modeenum"></a>`ModeEnum`
- **Type:** `string`
- **Description:** * `all` - all
* `new` - new
- **Enum Values:** `all`, `new`

### <a id="model-movie"></a>`Movie`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `logo` | object | Yes |  |
| `uuid` | string (uuid) | Yes |  |
| `name` | string | Yes |  |
| `description` | string | No |  |
| `year` | integer | No |  |
| `rating` | string | No |  |
| `genre` | string | No |  |
| `duration_secs` | integer | No | Duration in seconds |
| `tmdb_id` | string | No | TMDB ID for metadata |
| `imdb_id` | string | No | IMDB ID for metadata |
| `custom_properties` | object | No | Additional metadata and properties for the movie |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

---
### <a id="model-notificationtypeenum"></a>`NotificationTypeEnum`
- **Type:** `string`
- **Description:** * `version_update` - Version Update Available
* `setting_recommendation` - Recommended Setting Change
* `announcement` - System Announcement
* `warning` - Warning
* `info` - Information
- **Enum Values:** `version_update`, `setting_recommendation`, `announcement`, `warning`, `info`

### <a id="model-outputprofile"></a>`OutputProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Display name for this output profile |
| `command` | string | Yes | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | Yes | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |

---
### <a id="model-paginatedchannellist"></a>`PaginatedChannelList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [Channel](#model-channel) | Yes |  |

---
### <a id="model-paginateddeliveryloglist"></a>`PaginatedDeliveryLogList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [DeliveryLog](#model-deliverylog) | Yes |  |

---
### <a id="model-paginatedepisodelist"></a>`PaginatedEpisodeList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [Episode](#model-episode) | Yes |  |

---
### <a id="model-paginatedlogolist"></a>`PaginatedLogoList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [Logo](#model-logo) | Yes |  |

---
### <a id="model-paginatedmovielist"></a>`PaginatedMovieList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [Movie](#model-movie) | Yes |  |

---
### <a id="model-paginatedserieslist"></a>`PaginatedSeriesList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [Series](#model-series) | Yes |  |

---
### <a id="model-paginatedstreamlist"></a>`PaginatedStreamList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [Stream](#model-stream) | Yes |  |

---
### <a id="model-paginatedvodlogolist"></a>`PaginatedVODLogoList`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | integer | Yes |  |
| `next` | string (uri) | No |  |
| `previous` | string (uri) | No |  |
| `results` | Array of [VODLogo](#model-vodlogo) | Yes |  |

---
### <a id="model-patchedbulkchannelprofilemembership"></a>`PatchedBulkChannelProfileMembership`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `channels` | Array of [ChanneProfilelMembershipUpdate](#model-channeprofilelmembershipupdate) | No |  |

---
### <a id="model-patchedchannel"></a>`PatchedChannel`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `channel_number` | number (double) | No |  |
| `name` | string | No |  |
| `channel_group_id` | integer | No |  |
| `tvg_id` | string | No |  |
| `tvc_guide_stationid` | string | No |  |
| `epg_data_id` | integer | No |  |
| `streams` | Array of integer | No |  |
| `stream_profile_id` | integer | No |  |
| `uuid` | string (uuid) | No |  |
| `logo_id` | integer | No |  |
| `user_level` | integer | No |  |
| `is_adult` | boolean | No | Whether this channel contains adult content |
| `hidden_from_output` | boolean | No | Exclude this channel from downstream client output (HDHR, M3U, EPG, XC). Auto-sync still updates provider metadata. |
| `auto_created` | boolean | No | Whether this channel was automatically created via M3U auto channel sync |
| `auto_created_by` | integer | No | The M3U account that auto-created this channel |
| `auto_created_by_name` | string | No |  |
| `override` | object | No | Per-field overrides for an auto-created channel. Send {"override": {"name": "ESPN"}} to upsert the listed fields, {"override": {"name": null}} to clear specific fields while leaving others, or {"override": null} to delete the override row entirely. Omitting the key leaves any existing override unchanged. Only valid for auto_created=True channels. Duplicate channel_number values across channels are permitted; downstream client behavior on duplicates varies by client. |
| `source_stream` | string | No |  |
| `effective_name` | string | No |  |
| `effective_channel_number` | string | No |  |
| `effective_channel_group_id` | string | No |  |
| `effective_logo_id` | string | No |  |
| `effective_tvg_id` | string | No |  |
| `effective_tvc_guide_stationid` | string | No |  |
| `effective_epg_data_id` | string | No |  |
| `effective_stream_profile_id` | string | No |  |

---
### <a id="model-patchedchannelgroup"></a>`PatchedChannelGroup`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channel_count` | string | No |  |
| `m3u_account_count` | string | No |  |
| `m3u_accounts` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |

---
### <a id="model-patchedchannelprofile"></a>`PatchedChannelProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `channels` | string | No |  |

---
### <a id="model-patchedcoresettings"></a>`PatchedCoreSettings`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `key` | string | No |  |
| `name` | string | No |  |
| `value` | any | No |  |

---
### <a id="model-patchedepgsource"></a>`PatchedEPGSource`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `source_type` | [SourceTypeEnum](#model-sourcetypeenum) | No | Referenced model: `SourceTypeEnum` |
| `url` | string | No |  |
| `username` | string | No | Username for credential-based EPG sources (e.g. Schedules Direct) |
| `password` | string | No | Password for credential-based EPG sources (e.g. Schedules Direct) |
| `is_active` | boolean | No |  |
| `file_path` | string | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `priority` | integer | No | Priority for EPG matching (higher numbers = higher priority). Used when multiple EPG sources have matching entries for a channel. |
| `status` | [EPGSourceStatusEnum](#model-epgsourcestatusenum) | No | Referenced model: `EPGSourceStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `created_at` | string (date-time) | No | Time when this source was created |
| `updated_at` | string (date-time) | No | Time when this source was last successfully refreshed |
| `custom_properties` | object | No | Custom properties for source-specific configuration |
| `epg_data_count` | string | No |  |
| `has_channels` | boolean | No |  |

---
### <a id="model-patchedeventsubscription"></a>`PatchedEventSubscription`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `event` | [EventEnum](#model-eventenum) | No | Referenced model: `EventEnum` |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Optional Jinja2/Django template for customizing payload |
| `integration` | integer | No |  |

---
### <a id="model-patchedgroup"></a>`PatchedGroup`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `permissions` | Array of integer | No |  |

---
### <a id="model-patchedhdhrdevice"></a>`PatchedHDHRDevice`
- **Type:** `object`
- **Description:** Serializer for HDHomeRun device information

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `friendly_name` | string | No |  |
| `device_id` | string | No |  |
| `tuner_count` | integer | No |  |

---
### <a id="model-patchedintegration"></a>`PatchedIntegration`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `type` | [TypeEnum](#model-typeenum) | No | Referenced model: `TypeEnum` |
| `config` | any | No |  |
| `enabled` | boolean | No |  |
| `created_at` | string (date-time) | No |  |
| `subscriptions` | Array of [EventSubscription](#model-eventsubscription) | No |  |

---
### <a id="model-patchedlogo"></a>`PatchedLogo`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `channel_count` | string | No |  |
| `is_used` | string | No |  |
| `channel_names` | string | No |  |

---
### <a id="model-patchedm3uaccount"></a>`PatchedM3UAccount`
- **Type:** `object`
- **Description:** Serializer for M3U Account

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this M3U account |
| `server_url` | string | No |  |
| `file_path` | string | No |  |
| `server_group` | integer | No | The server group this M3U account belongs to |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this M3U account |
| `created_at` | string (date-time) | No | Time when this account was created |
| `updated_at` | string (date-time) | No | Time when this account was last successfully refreshed |
| `filters` | string | No |  |
| `user_agent` | integer | No |  |
| `profiles` | Array of [M3UAccountProfile](#model-m3uaccountprofile) | No |  |
| `locked` | boolean | No | Protected - can't be deleted or modified |
| `channel_groups` | Array of [ChannelGroupM3UAccount](#model-channelgroupm3uaccount) | No |  |
| `refresh_interval` | integer | No |  |
| `cron_expression` | string | No |  |
| `custom_properties` | object | No |  |
| `account_type` | [AccountTypeEnum](#model-accounttypeenum) | No | Referenced model: `AccountTypeEnum` |
| `username` | string | No |  |
| `password` | string | No |  |
| `stale_stream_days` | integer | No | Number of days after which a stream will be removed if not seen in the M3U source. |
| `priority` | integer | No | Priority for VOD provider selection (higher numbers = higher priority). Used when multiple providers offer the same content. |
| `status` | [M3UAccountStatusEnum](#model-m3uaccountstatusenum) | No | Referenced model: `M3UAccountStatusEnum` |
| `last_message` | string | No | Last status message, including success results or error information |
| `enable_vod` | boolean | No |  |
| `auto_enable_new_groups_live` | boolean | No |  |
| `auto_enable_new_groups_vod` | boolean | No |  |
| `auto_enable_new_groups_series` | boolean | No |  |
| `earliest_expiration` | string | No |  |
| `all_expirations` | string | No |  |
| `exp_date` | string (date-time) | No | Expiration date for the default profile (write-through) |

---
### <a id="model-patchedm3uaccountprofile"></a>`PatchedM3UAccountProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name for the M3U account profile |
| `max_streams` | integer | No | Maximum number of concurrent streams (0 for unlimited) |
| `is_active` | boolean | No | Set to false to deactivate this profile |
| `is_default` | boolean | No | Set to false to deactivate this profile |
| `current_viewers` | integer | No |  |
| `search_pattern` | string | No |  |
| `replace_pattern` | string | No |  |
| `custom_properties` | object | No | Custom properties for storing account information from provider (e.g., XC account details, expiration dates) |
| `exp_date` | string (date-time) | No | Account expiration date, auto-synced from custom_properties on save |
| `account` | string | No |  |

---
### <a id="model-patchedm3ufilter"></a>`PatchedM3UFilter`
- **Type:** `object`
- **Description:** Serializer for M3U Filters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `filter_type` | object | No | Filter based on either group title or stream name.<br><br>* `group` - Group<br>* `name` - Stream Name<br>* `url` - Stream URL |
| `regex_pattern` | string | No | A regex pattern to match streams or groups. |
| `exclude` | boolean | No | If True, matching items are excluded; if False, only matches are included. |
| `order` | integer | No |  |
| `custom_properties` | object | No |  |

---
### <a id="model-patchedoutputprofile"></a>`PatchedOutputProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Display name for this output profile |
| `command` | string | No | Executable to run (e.g. 'ffmpeg') |
| `parameters` | string | No | Command-line parameters. Must read from pipe:0 (stdin) and write to pipe:1 (stdout). |
| `is_active` | boolean | No | Whether this profile is available for use |
| `locked` | boolean | No | Protected - can't be deleted or modified |

---
### <a id="model-patchedprogramdata"></a>`PatchedProgramData`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `title` | string | No |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |

---
### <a id="model-patchedrecording"></a>`PatchedRecording`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `start_time` | string (date-time) | No |  |
| `end_time` | string (date-time) | No |  |
| `task_id` | string | No |  |
| `custom_properties` | object | No |  |
| `channel` | integer | No |  |

---
### <a id="model-patchedrecurringrecordingrule"></a>`PatchedRecurringRecordingRule`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | No |  |
| `end_time` | string (time) | No |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |
| `channel` | integer | No |  |

---
### <a id="model-patchedservergroup"></a>`PatchedServerGroup`
- **Type:** `object`
- **Description:** Serializer for Server Group

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Unique name for this server group. |

---
### <a id="model-patchedstream"></a>`PatchedStream`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | No |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |

---
### <a id="model-patchedstreamprofile"></a>`PatchedStreamProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |

---
### <a id="model-patchedsystemnotification"></a>`PatchedSystemNotification`
- **Type:** `object`
- **Description:** Serializer for system notifications.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `notification_key` | string | No |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | No |  |
| `message` | string | No |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | No |  |
| `is_dismissed` | string | No |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

---
### <a id="model-patcheduser"></a>`PatchedUser`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `username` | string | No | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | No |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |

---
### <a id="model-patcheduseragent"></a>`PatchedUserAgent`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No | The User-Agent name. |
| `user_agent` | string | No | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | No |  |
| `updated_at` | string (date-time) | No |  |

---
### <a id="model-patchedvodlogo"></a>`PatchedVODLogo`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | No |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `cache_url` | string | No |  |
| `movie_count` | string | No |  |
| `series_count` | string | No |  |
| `is_used` | string | No |  |
| `item_names` | string | No |  |

---
### <a id="model-permission"></a>`Permission`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `codename` | string | Yes |  |

---
### <a id="model-plugindetailmanifesterror"></a>`PluginDetailManifestError`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-plugindetailmanifestrequest"></a>`PluginDetailManifestRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `manifest_url` | string (uri) | Yes |  |

---
### <a id="model-plugindetailmanifestresponse"></a>`PluginDetailManifestResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `manifest` | object | Yes |  |
| `signature_verified` | boolean | Yes |  |

---
### <a id="model-plugininstallfromrepocreated"></a>`PluginInstallFromRepoCreated`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `success` | boolean | Yes |  |
| `plugin` | object | Yes |  |

---
### <a id="model-plugininstallfromrepoerror"></a>`PluginInstallFromRepoError`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-plugininstallfromreporequest"></a>`PluginInstallFromRepoRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo_id` | integer | Yes |  |
| `slug` | string | Yes |  |
| `version` | string | Yes |  |
| `download_url` | string (uri) | Yes |  |
| `sha256` | string | No |  |
| `min_dispatcharr_version` | string | No |  |
| `max_dispatcharr_version` | string | No |  |

---
### <a id="model-plugininstallfromreporesponse"></a>`PluginInstallFromRepoResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `success` | boolean | Yes |  |
| `plugin` | object | Yes |  |

---
### <a id="model-pluginrepo"></a>`PluginRepo`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string (uri) | Yes |  |
| `is_official` | boolean | Yes |  |
| `enabled` | boolean | No |  |
| `public_key` | string | No |  |
| `signature_verified` | boolean | Yes |  |
| `registry_url` | string | Yes |  |
| `plugin_count` | string | Yes |  |
| `last_fetched` | string (date-time) | Yes |  |
| `last_fetch_status` | string | Yes |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

---
### <a id="model-pluginreposettingsrequest"></a>`PluginRepoSettingsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_interval_hours` | integer | Yes |  |

---
### <a id="model-pluginreposettingsresponse"></a>`PluginRepoSettingsResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_interval_hours` | integer | Yes |  |

---
### <a id="model-pluginreposettingsupdated"></a>`PluginRepoSettingsUpdated`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_interval_hours` | integer | Yes |  |

---
### <a id="model-priorityenum"></a>`PriorityEnum`
- **Type:** `string`
- **Description:** * `low` - Low
* `normal` - Normal
* `high` - High
* `critical` - Critical
- **Enum Values:** `low`, `normal`, `high`, `critical`

### <a id="model-programdata"></a>`ProgramData`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |

---
### <a id="model-programdetail"></a>`ProgramDetail`
- **Type:** `object`
- **Description:** Rich serializer for program detail view — extends slim serializer with full custom_properties.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `tvg_id` | string | No |  |

---
### <a id="model-programsearchresult"></a>`ProgramSearchResult`
- **Type:** `object`
- **Description:** Full program data with associated channels and streams for search results.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `title` | string | Yes |  |
| `sub_title` | string | No |  |
| `description` | string | No |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `tvg_id` | string | No |  |
| `custom_properties` | object | No |  |
| `epg_source` | string | No |  |
| `epg_name` | string | No |  |
| `epg_icon_url` | string (uri) | No |  |
| `channels` | string | Yes |  |
| `streams` | string | Yes |  |

---
### <a id="model-recording"></a>`Recording`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `start_time` | string (date-time) | Yes |  |
| `end_time` | string (date-time) | Yes |  |
| `task_id` | string | Yes |  |
| `custom_properties` | object | No |  |
| `channel` | integer | Yes |  |

---
### <a id="model-recurringrecordingrule"></a>`RecurringRecordingRule`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `days_of_week` | any | No |  |
| `start_time` | string (time) | Yes |  |
| `end_time` | string (time) | Yes |  |
| `enabled` | boolean | No |  |
| `name` | string | No |  |
| `start_date` | string (date) | No |  |
| `end_date` | string (date) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |
| `channel` | integer | Yes |  |

---
### <a id="model-reorderchannelrequest"></a>`ReorderChannelRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `insert_after_id` | integer | No | ID of the channel to insert after. Use null to move to the beginning. |

---
### <a id="model-repoadderror"></a>`RepoAddError`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-repodeletenotfound"></a>`RepoDeleteNotFound`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-repodeletesuccess"></a>`RepoDeleteSuccess`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `success` | boolean | Yes |  |

---
### <a id="model-reponotfound"></a>`RepoNotFound`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-repopreviewrequest"></a>`RepoPreviewRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string (uri) | Yes |  |
| `public_key` | string | No |  |

---
### <a id="model-repopreviewresponse"></a>`RepoPreviewResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `valid` | boolean | Yes |  |
| `registry_name` | string | Yes |  |
| `registry_url` | string | Yes |  |
| `signature_verified` | boolean | Yes |  |
| `plugin_count` | integer | Yes |  |
| `errors` | Array of string | Yes |  |

---
### <a id="model-reporefresherror"></a>`RepoRefreshError`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-reporefreshnotfound"></a>`RepoRefreshNotFound`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | string | Yes |  |

---
### <a id="model-scopeenum"></a>`ScopeEnum`
- **Type:** `string`
- **Description:** * `title` - title
* `channel` - channel
- **Enum Values:** `title`, `channel`

### <a id="model-series"></a>`Series`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `logo` | object | Yes |  |
| `episode_count` | string | Yes |  |
| `uuid` | string (uuid) | Yes |  |
| `name` | string | Yes |  |
| `description` | string | No |  |
| `year` | integer | No |  |
| `rating` | string | No |  |
| `genre` | string | No |  |
| `tmdb_id` | string | No | TMDB ID for metadata |
| `imdb_id` | string | No | IMDB ID for metadata |
| `custom_properties` | object | No | Additional metadata and properties for the series |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

---
### <a id="model-seriesrulepreviewrequest"></a>`SeriesRulePreviewRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to search across all channels. |
| `mode` | object | No |  |
| `title` | string | No |  |
| `title_mode` | object | No |  |
| `description` | string | No |  |
| `description_mode` | object | No |  |
| `limit` | integer | No | Max programs to return (default 25, max 100) |

---
### <a id="model-seriesrulerequest"></a>`SeriesRuleRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tvg_id` | string | No | Optional channel TVG ID. Omit to match across all channels. |
| `mode` | object | No | all: record all episodes, new: record only new episodes<br><br>* `all` - all<br>* `new` - new |
| `title` | string | No | Series title |
| `title_mode` | object | No | How to match the title field<br><br>* `exact` - exact<br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `description` | string | No | Optional description match expression |
| `description_mode` | object | No | How to match the description field<br><br>* `contains` - contains<br>* `search` - search<br>* `regex` - regex |
| `channel_id` | integer | No | Optional channel to pin recordings to (defaults to lowest-numbered channel for the EPG) |

---
### <a id="model-servergroup"></a>`ServerGroup`
- **Type:** `object`
- **Description:** Serializer for Server Group

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Unique name for this server group. |

---
### <a id="model-setepgrequest"></a>`SetEpgRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `epg_data_id` | integer | Yes | EPG data ID to link |

---
### <a id="model-setsubscriptionsrequest"></a>`SetSubscriptionsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `event` | string | Yes | Event name (e.g. 'channel_start'). |
| `enabled` | boolean | No |  |
| `payload_template` | string | No | Custom payload template (webhook integrations only). |

---
### <a id="model-setsubscriptionsresponse"></a>`SetSubscriptionsResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `event` | string | Yes |  |
| `enabled` | boolean | Yes |  |
| `payload_template` | string | Yes |  |

---
### <a id="model-sourceenum"></a>`SourceEnum`
- **Type:** `string`
- **Description:** * `system` - System Generated
* `developer` - Developer Notification
- **Enum Values:** `system`, `developer`

### <a id="model-sourcetypeenum"></a>`SourceTypeEnum`
- **Type:** `string`
- **Description:** * `xmltv` - XMLTV URL
* `schedules_direct` - Schedules Direct API
* `dummy` - Custom Dummy EPG
- **Enum Values:** `xmltv`, `schedules_direct`, `dummy`

### <a id="model-stream"></a>`Stream`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | No |  |
| `url` | string | No |  |
| `m3u_account` | integer | No |  |
| `logo_url` | string | No |  |
| `tvg_id` | string | No |  |
| `local_file` | string (uri) | No |  |
| `current_viewers` | integer | No |  |
| `updated_at` | string (date-time) | Yes |  |
| `last_seen` | string (date-time) | No |  |
| `is_stale` | boolean | No | Whether this stream is stale (not seen in recent refresh, pending deletion) |
| `is_adult` | boolean | No | Whether this stream contains adult content |
| `stream_profile_id` | integer | No |  |
| `is_custom` | boolean | No | Whether this is a user-created stream or from an M3U account |
| `channel_group` | integer | No |  |
| `stream_hash` | string | No | Unique hash for this stream from the M3U account |
| `stream_stats` | object | No | JSON object containing stream statistics like video codec, resolution, etc. |
| `stream_stats_updated_at` | string (date-time) | No | When stream statistics were last updated |
| `stream_id` | integer | No | Provider stream ID (e.g., XC stream_id) for stable identity across credential changes |
| `stream_chno` | number (double) | No | Provider channel number (XC num or M3U tvg-chno) for ordering - supports decimals like 2.1 |

---
### <a id="model-streambyidsrequest"></a>`StreamByIdsRequest`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ids` | Array of integer | Yes | List of stream IDs to retrieve |

---
### <a id="model-streamprofile"></a>`StreamProfile`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | Name of the stream profile |
| `command` | string | No | Command to execute (e.g., 'yt.sh', 'streamlink', or 'vlc') |
| `parameters` | string | No | Command-line parameters. Use {userAgent} and {streamUrl} as placeholders. |
| `is_active` | boolean | No | Whether this profile is active |
| `user_agent` | integer | No | Optional user agent to use. If not set, you can fall back to a default. |
| `locked` | boolean | No | Protected - can't be deleted or modified |

---
### <a id="model-streamregexpreviewresponse"></a>`StreamRegexPreviewResponse`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `total_in_group` | integer | Yes |  |
| `total_scanned` | integer | Yes |  |
| `scan_limit_hit` | boolean | Yes |  |
| `find_matches` | Array of object | No |  |
| `find_match_count` | integer | No |  |
| `filter_matches` | Array of object | No |  |
| `filter_match_count` | integer | No |  |
| `exclude_matches` | Array of object | No |  |
| `exclude_match_count` | integer | No |  |
| `find_error` | string | No |  |
| `match_error` | string | No |  |
| `exclude_error` | string | No |  |

---
### <a id="model-systemnotification"></a>`SystemNotification`
- **Type:** `object`
- **Description:** Serializer for system notifications.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `notification_key` | string | Yes |  |
| `notification_type` | [NotificationTypeEnum](#model-notificationtypeenum) | No | Referenced model: `NotificationTypeEnum` |
| `priority` | [PriorityEnum](#model-priorityenum) | No | Referenced model: `PriorityEnum` |
| `title` | string | Yes |  |
| `message` | string | Yes |  |
| `action_data` | any | No |  |
| `is_active` | boolean | No |  |
| `admin_only` | boolean | No |  |
| `expires_at` | string (date-time) | No |  |
| `created_at` | string (date-time) | Yes |  |
| `is_dismissed` | string | Yes |  |
| `source` | [SourceEnum](#model-sourceenum) | No | Referenced model: `SourceEnum` |

---
### <a id="model-titlemodeenum"></a>`TitleModeEnum`
- **Type:** `string`
- **Description:** * `exact` - exact
* `contains` - contains
* `search` - search
* `regex` - regex
- **Enum Values:** `exact`, `contains`, `search`, `regex`

### <a id="model-tokenobtainpair"></a>`TokenObtainPair`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |

---
### <a id="model-tokenrefresh"></a>`TokenRefresh`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `access` | string | Yes |  |
| `refresh` | string | Yes |  |

---
### <a id="model-typeenum"></a>`TypeEnum`
- **Type:** `string`
- **Description:** * `webhook` - Webhook
* `api` - API
* `script` - Custom Script
- **Enum Values:** `webhook`, `api`, `script`

### <a id="model-user"></a>`User`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `username` | string | Yes | Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. |
| `api_key` | string | Yes |  |
| `email` | string (email) | No |  |
| `user_level` | integer | No |  |
| `password` | string | No |  |
| `channel_profiles` | Array of integer | No |  |
| `custom_properties` | object | No |  |
| `avatar_config` | object | No |  |
| `stream_limit` | integer | No |  |
| `is_staff` | boolean | No | Designates whether the user can log into this admin site. |
| `is_superuser` | boolean | No | Designates that this user has all permissions without explicitly assigning them. |
| `last_login` | string (date-time) | No |  |
| `date_joined` | string (date-time) | No |  |
| `first_name` | string | No |  |
| `last_name` | string | No |  |

---
### <a id="model-useragent"></a>`UserAgent`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes | The User-Agent name. |
| `user_agent` | string | Yes | The complete User-Agent string sent by the client. |
| `description` | string | No | An optional description of the client or device type. |
| `is_active` | boolean | No | Whether this user agent is currently allowed/recognized. |
| `created_at` | string (date-time) | Yes |  |
| `updated_at` | string (date-time) | Yes |  |

---
### <a id="model-vodcategory"></a>`VODCategory`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `category_type` | object | No | Type of content this category contains<br><br>* `movie` - Movie<br>* `series` - Series |
| `category_type_display` | string | Yes |  |
| `m3u_accounts` | Array of [M3UVODCategoryRelation](#model-m3uvodcategoryrelation) | Yes |  |

---
### <a id="model-vodlogo"></a>`VODLogo`
- **Type:** `object`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes |  |
| `name` | string | Yes |  |
| `url` | string | Yes |  |
| `cache_url` | string | Yes |  |
| `movie_count` | string | Yes |  |
| `series_count` | string | Yes |  |
| `is_used` | string | Yes |  |
| `item_names` | string | Yes |  |

---