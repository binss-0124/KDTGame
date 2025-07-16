export const math = (function() {
    return {
        // 범위 내 랜덤 실수값 생성
        rand_range: function(a, b) {
            return Math.random() * (b - a) + a;
        },
        
        // 가우시안 분포에 가까운 랜덤값
        rand_normalish: function() {
            const r = Math.random() + Math.random() + Math.random() + Math.random();
            return (r / 4.0) * 2.0 - 1;
        },
        
        // 범위 내 랜덤 정수값 생성
        rand_int: function(a, b) {
            return Math.round(Math.random() * (b - a) + a);
        },
        
        // 선형 보간
        lerp: function(x, a, b) {
            return x * (b - a) + a;
        },
        
        // 부드러운 보간
        smoothstep: function(x, a, b) {
            x = x * x * (3.0 - 2.0 * x);
            return x * (b - a) + a;
        },
        
        // 더 부드러운 보간
        smootherstep: function(x, a, b) {
            x = x * x * x * (x * (x * 6 - 15) + 10);
            return x * (b - a) + a;
        },
        
        // 값 범위 제한
        clamp: function(x, a, b) {
            return Math.min(Math.max(x, a), b);
        },
        
        // 0-1 사이로 값 제한
        sat: function(x) {
            return Math.min(Math.max(x, 0.0), 1.0);
        },
        
        // 범위 내 값인지 확인
        in_range: (x, a, b) => {
            return x >= a && x <= b;
        },
        
        // 두 공의 탄성 충돌 후 속도 계산 (1D 충돌 가정)
        // m1, m2: 공의 질량
        // v1, v2: 공의 초기 속도
        // x1, x2: 공의 초기 위치 (충돌 후 겹침 방지용)
        calculateCollisionResponse: function(ball1, ball2) {
            const m1 = 1; // 공의 질량 (모든 공이 동일하다고 가정)
            const m2 = 1;

            const v1 = ball1.velocity_;
            const v2 = ball2.velocity_;

            const x1 = ball1.mesh_.position;
            const x2 = ball2.mesh_.position;

            // 충돌 법선 벡터 (두 공의 중심을 잇는 벡터)
            const normal = new THREE.Vector3().subVectors(x1, x2).normalize();

            // 각 공의 속도 벡터를 법선 벡터에 투영
            const v1n = v1.dot(normal);
            const v2n = v2.dot(normal);

            // 1D 탄성 충돌 공식 적용
            const v1f = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
            const v2f = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);

            // 법선 방향 속도 업데이트
            ball1.velocity_.add(normal.clone().multiplyScalar(v1f - v1n));
            ball2.velocity_.add(normal.clone().multiplyScalar(v2f - v2n));

            // 공들이 겹치는 것을 방지하기 위해 약간 밀어냄
            const overlap = (ball1.boundingBox_.min.distanceTo(ball2.boundingBox_.max) + ball1.boundingBox_.max.distanceTo(ball2.boundingBox_.min)) / 2;
            const separationVector = normal.clone().multiplyScalar(overlap * 0.5); // 겹침의 절반만큼 밀어냄

            ball1.position_.add(separationVector);
            ball2.position_.sub(separationVector);
        },
    };
})();
