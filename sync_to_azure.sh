#!/bin/bash

# Répertoire local contenant votre code source
LOCAL_DIR="/var/www/project"

# Adresse IP ou nom de domaine de votre machine virtuelle Azure
REMOTE_HOST="98.66.232.248"

# Utilisateur pour la connexion SSH à la machine virtuelle
REMOTE_USER="marwen"

# Chemin du répertoire distant sur la machine virtuelle Azure
REMOTE_DIR="/var/www/root"

# Clé SSH pour la connexion à la machine virtuelle
SSH_KEY="~/.ssh/marwenvm_key.pem"

# Synchroniser les fichiers
rsync -avz --delete --exclude '.git' $LOCAL_DIR/ -e "ssh -i $SSH_KEY" $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR
