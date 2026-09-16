pipeline {
    agent any

    triggers {
        githubPush()
    }
    environment {
        SSH_CREDENTIALS_ID = 'devwiki-target-ssh'
        DEPLOY_HOST_ID     = 'devwiki-deploy-host'
        DEPLOY_USER_ID     = 'devwiki-deploy-user'
        DEPLOY_DIR_ID      = 'devwiki-deploy-dir'
    }

    stages {
        stage('Prepare') {
            steps {
                echo "Bắt đầu deploy Monitoring Stack cập nhật từ GitHub..."
            }
        }

        stage('Deploy to VM 1') {
            steps {
                withCredentials([
                    string(credentialsId: env.SSH_CREDENTIALS_ID, variable: 'SSH_PASSWORD'),
                    string(credentialsId: env.DEPLOY_HOST_ID, variable: 'DEPLOY_HOST'),
                    string(credentialsId: env.DEPLOY_USER_ID, variable: 'DEPLOY_USER'),
                    string(credentialsId: env.DEPLOY_DIR_ID, variable: 'DEPLOY_DIR')
                ]) {
                    sh '''
                        set -eu
                        export SSHPASS="$SSH_PASSWORD"
                        SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
                        REMOTE="$DEPLOY_USER@$DEPLOY_HOST"
                        
                        
                        TARGET_DIR="$DEPLOY_DIR/monitoring"

                        echo "Tạo thư mục đích trên VM 1..."
                        sshpass -e ssh $SSH_OPTS "$REMOTE" "mkdir -p $TARGET_DIR"

                        echo "Copy file cấu hình sang VM 1..."
                        sshpass -e scp $SSH_OPTS -r docker-compose.yml prometheus alertmanager grafana "$REMOTE:$TARGET_DIR/"

                        echo "Khởi động lại Monitoring Stack..."
                        sshpass -e ssh $SSH_OPTS "$REMOTE" bash -s -- "$TARGET_DIR" <<'REMOTE_SCRIPT'
                            set -eu
                            cd "$1"
                            
                            docker compose pull
                            docker compose up -d --remove-orphans
                            
                            docker compose restart
REMOTE_SCRIPT
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Deploy Monitoring Stack thành công!"
        }
        failure {
            echo "Deploy Monitoring Stack thất bại. Vui lòng kiểm tra log Jenkins."
        }
    }
}