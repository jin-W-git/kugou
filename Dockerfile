# 使用官方 nginx 镜像作为基础
FROM nginx

# 将 dist 文件夹中的内容复制到 Nginx 默认网页目录
# 注释说明：将 dist 文件中的内容复制到 /usr/share/nginx/html/ 这个目录下面
ADD dist/ /usr/share/nginx/html/

# 将自定义的 nginx.conf 配置文件复制到容器中
ADD nginx.conf /etc/nginx/nginx.conf

# 构建时执行的命令，输出提示信息
RUN echo 'echo init ok!!'