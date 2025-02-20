# 성능 최적화 보고서
### 배포 파이프라인(github action)

**1. Github 저장소 코드를 워크 플로우 실행 환경으로 체크아웃**
```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```
**2. `npm ci` 명령어를 통해 프로젝트 의존성 설치**
```yaml
- name: Install dependencies
  run: npm ci
```
**3. `npm run build` 명령어를 통해 빌드 스크립트 실행**
```yaml
- name: Build
  run: npm run build
```
**4. AWS 인증 정보 설정**
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v1
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}
```
**5. AWS S3 버킷에 빌드 결과물 업로드**
```yaml
- name: Deploy to S3
  run: |
    aws s3 sync out/ s3://${{ secrets.S3_BUCKET_NAME }} --delete
```
**6. CloudFront의 캐시 무효화**
```yaml
- name: Invalidate CloudFront cache
  run: |
    aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```
Github action을 통한 빌드 파이프라인은 위와 같은 스텝을 거쳐 배포되게 됩니다.
이때 CloudFront에 대해 캐시 무효화를 해주어야 최신 버전의 웹사이트를 보장할 수 있습니다.

### 성능 비교
이번 과제는 Next.js를 이용한 정적 배포이기 때문에 정적 배포로 사용할 수 있는 가장 대표적인 서비스인 블로그를 간단하게 구현하였습니다.
/content 폴더 내에 mdx 파일을 두고 해당 폴더 내 mdx 파일에 대해 동적 라우트를 설정하는 방식입니다. 
동적 라우트의 경우 output을 두고 빌드하는 정적 배포 방식에서 사용될 수 없으나 Next에서 지원하는 `generateStaticParams` 메서드를 통해 빌드 시점에 정적으로 페이지를 미리 생성할 수 있습니다.
```tsx
export const dynamicParams = false;

export function generateStaticParams() {
    return [{slug: 'test-1'}, {slug: 'test-2'}]
}
```

현재는 test-1, test-2에 대한 두 개의 페이지를 생성하였으며 test-1의 경우 실제 블로그 글, test-2의 경우 고해상도 이미지를 10개 넣은 페이지를 만들었습니다.
먼저 S3 버킷에 캐싱이 적용되지 않은 채로 단순히 정적 배포된 웹사이트와 CloudFront의 성능을 비교해보겠습니다.


먼저 S3의 경우 메인페이지, test-1, test-2에 대해 각각 응답까지 200ms,208ms,206ms가 소요되었습니다.
![img_2](https://github.com/user-attachments/assets/1a6705fa-6002-413d-aa9a-b8613d818db5)

반면 CloudFront의 경우 메인페이지, test-1, test-2에 대해 각각 응답까지 22ms, 13ms, 21ms가 소요되었습니다.
![img_3](https://github.com/user-attachments/assets/6345253e-5610-4dd0-9fdd-f17ab3c121a2)

CloudFront의 엣지 로케이션과 캐싱 메커니즘을 통해 10배 이상으로 응답 속도가 개선되었음을 확인할 수 있습니다.

### 이미지 최적화
그러나 여전히 한가지 아쉬운 점이 있습니다. 
이미지를 10개 넣은 페이지의 경우 고용량 이미지에 대해 응답속도가 여전히 느리고 무거운 용량에 대한 최적화가 이루어지지 않았다는 점입니다.
![img_4](https://github.com/user-attachments/assets/1fcbc6d0-95f4-4f7a-8ad6-5e2487afebb2)

Next.js에서 지원하는 Next/Image의 경우 이미지 최적화를 위해 별도의 서버가 필요하기 때문에 지금과 같이 S3 + CloudFront를 사용하는 환경에선 바로 이용할 수 없습니다.
이럴 때 AWS Lambda를 이용하여 이미지를 리사이징할 수 있습니다.

옵션과 함께 요청된 이미지가 CloudFront에 캐싱되어있는 경우 해당 이미지를 이용하고 그렇지 않은 경우 lambda 함수를 통해 원본 이미지를 변환하여 저장한 다음 캐싱합니다.
이때 resize option 내에 width, height, quality 등의 resize option을 받아 `Sharp` 라이브러리를 통해 이미지를 변형한 뒤 리턴하도록 합니다.
```js
if (operationsJSON['width']) resizingOptions.width = parseInt(operationsJSON['width']);
if (operationsJSON['height']) resizingOptions.height = parseInt(operationsJSON['height']);
if (resizingOptions) transformedImage = transformedImage.resize(resizingOptions);
```

기존에 용량이 5.5MB, 응답 시간이 거의 1초 가까이 걸렸던 cat-7.jpg의 경우 `?format=auto&width=200`와 같은 리사이즈 옵션과 함께
이미지를 캐싱함으로써 용량은 4.7kB, 응답속도는 54ms로 크게 개선되었습니다.
![img_6](https://github.com/user-attachments/assets/951224e1-3ae1-4b4f-86ad-166f312b3941)

> [!NOTE]
> 앞서 언급한대로 SSG 방식으로 배포할 경우 Next Image의 Default Loader와 충돌이 발생하는데 리사이징에 대한 Lambda를 설정한 뒤 아래와 같이 Custom Loader 사용할 수 있습니다.
```tsx
const myLoader = ({ src, width, quality }) => {
    if (quality) {
        return ` https://cloudfront.net${src}?format=auto&quality=${quality}&width=${width}`;
    } else return ` https://cloudfront.net${src}?format=auto&width=${width}`;
}
...
<Image src="/images/cat-1.jpg" loader={myLoader} width={300} height={400} quality={70} />            
```

### 다이어그램
![img_7](https://github.com/user-attachments/assets/ddb7783e-6d0c-4fe1-9766-891c5e49a945)

